import {
  _decorator,
  Component,
  Node,
  Vec3,
  EventTouch,
  UITransform,
  view,
  find,
  tween
} from 'cc';
const { ccclass, property } = _decorator;
import {
  globalEvent,
  GlobalEvent,
  AUDIO_ENUM,
  GAME_STATUS,
  getGameStatus,
  GAME_FIGURE_KEY,
  gameFigure
} from 'db://assets/scripts/global';
import { playOneShot } from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';

@ccclass('SceneMove')
export class SceneMove extends Component {
  @property(Node)
  private sceneNode: Node = null; // 需要移动的场景节点

  @property(Node)
  private bgNode: Node = null; // 背景节点，用于确定场景尺寸

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();
  private _lastTouchPos: Vec3 = new Vec3(); // 上一次触摸位置
  private _isTouching: boolean = false; // 是否正在触摸
  private _minPos: Vec3 = new Vec3(); // 最小边界
  private _maxPos: Vec3 = new Vec3(); // 最大边界
  private _canvasNode: Node = null; // Canvas 节点，用于监听触摸事件

  onLoad() {
    this._initPosition = this.node.position.clone();
    this._initScale = this.node.getScale().clone();
    //通用组件模板，默认提供全局事件绑定、UI事件绑定、初始化方法
    this.bindGlobalEvent();
    this.bindUIEvent();
    this.init();
  }

  update(deltaTime: number) {}

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
    globalEvent.on(GlobalEvent.FOCUS_TO_NODE, this.moveToCenter, this);
  }

  bindUIEvent() {
    this._canvasNode = find('Canvas');
    this._canvasNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this._canvasNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this._canvasNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this._canvasNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);

    // 初始化场景节点位置
    if (this.sceneNode) {
      this.sceneNode.setPosition(Vec3.ZERO);
    }

    // 计算边界
    this.calculateBounds();
  }

  // 计算移动边界
  private calculateBounds() {
    if (!this.sceneNode || !this.bgNode) {
      console.warn('SceneMove: sceneNode 或 bgNode 未设置');
      return;
    }

    // 获取可视区域大小
    const visibleSize = view.getVisibleSize();
    const viewHalfWidth = visibleSize.width / 2;
    const viewHalfHeight = visibleSize.height / 2;

    // 获取背景节点的尺寸和本地坐标
    const bgTransform = this.bgNode.getComponent(UITransform);
    if (!bgTransform) {
      console.warn('SceneMove: bgNode 没有 UITransform 组件');
      return;
    }

    const bgWidth = bgTransform.width;
    const bgHeight = bgTransform.height;
    const bgLocalX = this.bgNode.position.x;
    const bgLocalY = this.bgNode.position.y;
    const anchorX = bgTransform.anchorX;
    const anchorY = bgTransform.anchorY;

    // 计算 bg 在 scene 本地坐标系中的四个边界
    const bgLeft = bgLocalX - bgWidth * anchorX;
    const bgRight = bgLocalX + bgWidth * (1 - anchorX);
    const bgBottom = bgLocalY - bgHeight * anchorY;
    const bgTop = bgLocalY + bgHeight * (1 - anchorY);

    // 左边的X间距
    const maxX = -viewHalfWidth - bgLeft;

    // 右边的X间距
    const minX = viewHalfWidth - bgRight;

    // 底部的Y间距
    const maxY = -viewHalfHeight - bgBottom;

    // 顶部的Y间距
    const minY = viewHalfHeight - bgTop;

    this._minPos.set(minX, minY, 0);
    this._maxPos.set(maxX, maxY, 0);

    console.log('边界计算详情:', {
      可视区域: { width: visibleSize.width, height: visibleSize.height },
      bg本地位置: { x: bgLocalX, y: bgLocalY },
      bg尺寸: { width: bgWidth, height: bgHeight },
      bg锚点: { x: anchorX, y: anchorY },
      bg本地边界: {
        left: bgLeft,
        right: bgRight,
        bottom: bgBottom,
        top: bgTop
      },
      scene移动范围: { minX, maxX, minY, maxY }
    });
  }

  // 触摸开始
  private onTouchStart(event: EventTouch) {
    this._isTouching = true;
    const touchPos = event.getUILocation();
    this._lastTouchPos.set(touchPos.x, touchPos.y, 0);
  }

  // 触摸移动
  private onTouchMove(event: EventTouch) {
    if (!this._isTouching || !this.sceneNode) {
      return;
    }

    // 获取当前触摸位置
    const touchPos = event.getUILocation();
    const currentTouchPos = new Vec3(touchPos.x, touchPos.y, 0);

    // 计算触摸位移
    const delta = new Vec3();
    Vec3.subtract(delta, currentTouchPos, this._lastTouchPos);

    // 应用位移到场景节点
    const newPos = this.sceneNode.position.clone();
    newPos.add(delta);

    // 应用边界限制
    newPos.x = Math.max(this._minPos.x, Math.min(this._maxPos.x, newPos.x));
    newPos.y = Math.max(this._minPos.y, Math.min(this._maxPos.y, newPos.y));

    this.sceneNode.setPosition(newPos);

    // 更新上一次触摸位置
    this._lastTouchPos.set(currentTouchPos);
  }

  // 触摸结束
  private onTouchEnd(event: EventTouch) {
    this._isTouching = false;
  }

  onDestroy() {
    // 清理事件监听
    if (this._canvasNode) {
      this._canvasNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
      this._canvasNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
      this._canvasNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
      this._canvasNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    // 停止缓动动画
    this.stopMovement();

    globalEvent.off(GlobalEvent.GAME_RESET, this.init, this);
  }

  /**
   * 将指定节点移动到视野中心
   * @param targetNode 目标节点（必须是 sceneNode 的子节点或后代节点）
   * @param duration 动画时长（秒），默认 0.3，设为 0 则立即移动
   */
  public moveToCenter(targetNode: Node, duration: number = 0.2) {
    if (!this.sceneNode || !targetNode) {
      console.warn('SceneMove.moveToCenter: sceneNode 或 targetNode 为空');
      return;
    }

    // 获取目标节点在 scene 坐标系中的位置
    // 如果目标是 scene 的直接子节点，直接用 position
    // 否则需要转换坐标
    let targetLocalPos: Vec3;

    if (targetNode.parent === this.sceneNode) {
      // 直接子节点
      targetLocalPos = targetNode.position.clone();
    } else {
      // 需要转换为相对于 scene 的坐标
      const targetWorldPos = targetNode.worldPosition;
      targetLocalPos = this.sceneNode
        .getComponent(UITransform)
        .convertToNodeSpaceAR(targetWorldPos);
    }

    // 要让目标节点显示在屏幕中心(0, 0)
    // 目标世界坐标 = sceneNode.position + targetLocalPos = (0, 0)
    // 所以 sceneNode 需要移动到：-targetLocalPos
    const targetScenePos = new Vec3(-targetLocalPos.x, -targetLocalPos.y, 0);

    // 应用边界限制
    targetScenePos.x = Math.max(
      this._minPos.x,
      Math.min(this._maxPos.x, targetScenePos.x)
    );
    targetScenePos.y = Math.max(
      this._minPos.y,
      Math.min(this._maxPos.y, targetScenePos.y)
    );

    // 停止可能正在进行的缓动
    tween(this.sceneNode).stop();

    if (duration <= 0) {
      // 立即移动
      this.sceneNode.setPosition(targetScenePos);
    } else {
      // 平滑移动
      tween(this.sceneNode)
        .to(duration, { position: targetScenePos }, { easing: 'sineOut' })
        .start();
    }

    console.log('移动到中心:', {
      目标节点名称: targetNode.name,
      目标本地坐标: targetLocalPos,
      场景移动到: targetScenePos
    });
  }

  /**
   * 停止所有移动动画
   */
  public stopMovement() {
    if (this.sceneNode) {
      tween(this.sceneNode).stop();
    }
  }
}
