import {
  _decorator,
  Component,
  Node,
  Vec2,
  Vec3,
  UITransform,
  EventTouch,
  Input,
  Camera,
  find,
  UIOpacity,
  view,
  sys
} from 'cc';
const { ccclass, property } = _decorator;
import { globalEvent, GlobalEvent } from '../global';

/**
 * 虚拟摇杆控制器
 * 默认隐藏，触摸时在触摸位置显示
 */
@ccclass('Joystick')
export class Joystick extends Component {
  @property({
    type: Node,
    displayName: '触摸区域',
    tooltip: '触摸区域，如果不设置则默认监听Canvas'
  })
  nodeAreaTrigger: Node = null;

  /** 摇杆中心点引用 */
  private nodeJoystickTarget: Node = null;

  /** 摇杆可移动半径 */
  private _radius: number = 50;

  /** 是否正在触摸摇杆 */
  private _isTouching: boolean = false;

  /** 触摸起始位置 */
  private _touchStartPos = new Vec2(0, 0);

  /** 摇杆UI变换组件 */
  private _uiTransform: UITransform = null;

  /** 摇杆不透明度组件 */
  private _uiOpacity: UIOpacity = null;

  private _enable: boolean = false;

  /** 触摸区域的UI变换组件 */
  private _areaTriggerUITransform: UITransform = null;

  _camera: Node = null;

  onLoad() {
    if (this.node.parent.name !== 'Camera') {
      this._camera = find('Canvas/Camera');
    } else {
      this._camera = null;
    }

    this.nodeAreaTrigger = this.nodeAreaTrigger || find('Canvas');

    this.nodeJoystickTarget = this.node.children[0];
    // 获取组件引用
    this._uiTransform = this.node.getComponent(UITransform);
    this._uiOpacity = this.node.getComponent(UIOpacity);
    if (!this._uiOpacity) {
      this._uiOpacity = this.node.addComponent(UIOpacity);
    }
    this._areaTriggerUITransform =
      this.nodeAreaTrigger.getComponent(UITransform);
    // 计算摇杆可移动半径
    this._radius =
      this._uiTransform.width / 2 -
      this.nodeJoystickTarget.getComponent(UITransform).width / 2;

    this.bindGlobalEvent();

    this.bindUIEvent();
  }

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.DISABLE_JOYSTICK, () => {
      this._enable = false;
    });
    globalEvent.on(GlobalEvent.ENABLE_JOYSTICK, () => {
      this._enable = true;
    });
    globalEvent.on(GlobalEvent.GAME_PAUSE, () => {
      this._enable = false;
    });
    globalEvent.on(GlobalEvent.GAME_RESUME, () => {
      this._enable = true;
    });
    globalEvent.on(GlobalEvent.GAME_WIN, () => {
      this._enable = false;
    });
    globalEvent.on(GlobalEvent.GAME_FAIL, () => {
      this._enable = true;
    });
    globalEvent.on(GlobalEvent.GAME_RESET, () => {
      this._enable = false;
    });
    globalEvent.on(GlobalEvent.GAME_START, () => {
      this._enable = true;
    });
  }

  bindUIEvent() {
    // 注册触摸事件监听
    this.nodeAreaTrigger.on(
      Node.EventType.TOUCH_START,
      this._onTouchStart,
      this
    );
    this.nodeAreaTrigger.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
    this.nodeAreaTrigger.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
    this.nodeAreaTrigger.on(
      Node.EventType.TOUCH_CANCEL,
      this._onTouchEnd,
      this
    );
  }

  onDestroy() {
    // 移除事件监听
    this.nodeAreaTrigger.off(
      Node.EventType.TOUCH_START,
      this._onTouchStart,
      this
    );
    this.nodeAreaTrigger.off(
      Node.EventType.TOUCH_MOVE,
      this._onTouchMove,
      this
    );
    this.nodeAreaTrigger.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
    this.nodeAreaTrigger.off(
      Node.EventType.TOUCH_CANCEL,
      this._onTouchEnd,
      this
    );
  }

  /**
   * 处理触摸开始
   */
  private _handleTouchStart(pos: Vec2) {
    if (!this._enable) return;
    if (this._isTouching) return;

    // 将UI坐标转换为节点空间坐标
    const nodePos = this._areaTriggerUITransform.convertToNodeSpaceAR(
      new Vec3(pos.x, pos.y, 0)
    );
    this._touchStartPos.set(nodePos.x, nodePos.y);

    // nodePos.x += this.nodeAreaTrigger.position.x;
    // nodePos.y += this.nodeAreaTrigger.position.y;

    // 设置摇杆位置到触摸位置
    // 考虑摄像机偏移
    if (this._camera) {
      const cameraPos = this._camera.position;
      nodePos.x += cameraPos.x;
      nodePos.y += cameraPos.y;
    }
    this.node.setPosition(nodePos.x, nodePos.y, 0);

    // 重置摇杆目标位置到中心
    this.nodeJoystickTarget.setPosition(0, 0, 0);

    // 显示摇杆
    this._uiOpacity.opacity = 255;

    // 设置触摸状态
    this._isTouching = true;

    globalEvent.emit(GlobalEvent.JOYSTICK_TOUCH_START);
  }

  /**
   * 处理触摸移动
   */
  private _handleTouchMove(pos: Vec2) {
    if (!this._enable || !this._isTouching) return;

    // 将UI坐标转换为节点空间坐标
    const nodePos = this._areaTriggerUITransform.convertToNodeSpaceAR(
      new Vec3(pos.x, pos.y, 0)
    );

    // 计算相对于摇杆中心的位移向量
    const moveVec = new Vec2(
      nodePos.x - this._touchStartPos.x,
      nodePos.y - this._touchStartPos.y
    );

    // 计算位移距离
    const distance = moveVec.length();

    // 限制摇杆移动范围
    if (distance > this._radius) {
      moveVec.multiplyScalar(this._radius / distance);
    }

    // 更新摇杆目标位置
    this.nodeJoystickTarget.setPosition(moveVec.x, moveVec.y, 0);
  }

  /**
   * 处理触摸结束
   */
  private _handleTouchEnd() {
    // 重置摇杆目标位置
    this.nodeJoystickTarget.setPosition(0, 0, 0);

    // 隐藏摇杆
    this._uiOpacity.opacity = 0;

    // 重置触摸状态
    this._isTouching = false;

    globalEvent.emit(GlobalEvent.JOYSTICK_TOUCH_END);
  }

  /**
   * 触摸开始事件处理（引擎事件系统）
   */
  private _onTouchStart(event: EventTouch) {
    // 获取触摸位置（UI坐标系）
    const touchPos = event.getUILocation();
    this._handleTouchStart(touchPos);
  }

  /**
   * 触摸移动事件处理（引擎事件系统）
   */
  private _onTouchMove(event: EventTouch) {
    // 获取当前触摸位置
    const touchPos = event.getUILocation();
    this._handleTouchMove(touchPos);
  }

  /**
   * 触摸结束事件处理（引擎事件系统）
   */
  private _onTouchEnd() {
    this._handleTouchEnd();
  }

  update(deltaTime: number) {
    if (!this._isTouching) return;

    // 获取摇杆方向
    const joystickPos = this.nodeJoystickTarget.position;
    const moveDir = new Vec2(joystickPos.x, joystickPos.y);

    // 计算距离
    const distance = moveDir.length();
    if (distance === 0) return;

    // 标准化方向向量
    moveDir.multiplyScalar(1 / distance);

    globalEvent.emit(GlobalEvent.JOYSTICK_MOVE, { moveDir, deltaTime });
  }
}
