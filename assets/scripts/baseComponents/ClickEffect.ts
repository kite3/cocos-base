import {
  _decorator,
  Animation,
  Component,
  Node,
  input,
  Input,
  EventTouch,
  Vec3,
  UITransform,
  director,
  Camera,
  find
} from 'cc';
import { globalEvent, GlobalEvent } from '../global';
const { ccclass, property } = _decorator;

@ccclass('ClickEffect')
export class ClickEffect extends Component {
  @property({
    type: Node,
    displayName: '事件监听节点',
    tooltip: '指定要监听点击事件的节点，如果不设置则默认监听Canvas'
  })
  public listenNode: Node = null;

  _camera: Camera = null;

  onLoad() {
    if (this.node.parent.name !== 'Camera') {
      this._camera = find('Canvas/Camera').getComponent(Camera);
    } else {
      this._camera = null;
    }

    this.node.getComponent(Animation)?.on(
      Animation.EventType.LASTFRAME,
      () => {
        this.node.active = false;
      },
      this
    );
    this.node.getComponent(Animation)?.on(
      Animation.EventType.FINISHED,
      () => {
        this.node.active = false;
      },
      this
    );

    globalEvent.on(
      GlobalEvent.CLICK_EFFECT,
      event => {
        this.node.active = true;
        this.node.getComponent(Animation)?.play();
      },
      this
    );

    // 设置事件监听节点
    this.setupEventListener();
  }

  start() {
    this.node.active = false;
  }

  // 设置事件监听
  setupEventListener() {
    // 获取监听节点，优先使用用户设置的节点，否则使用Canvas
    let targetNode = this.listenNode;

    if (!targetNode) {
      // 如果没有设置监听节点，则默认使用Canvas
      targetNode = director.getScene().getChildByName('Canvas');
      if (!targetNode) {
        console.warn('未找到Canvas节点，且未设置监听节点');
        return;
      }
    }

    // 使用事件冒泡机制，监听目标节点上的所有子节点事件
    targetNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
  }

  // 获取当前监听的节点
  getListenNode(): Node {
    return this.listenNode || director.getScene().getChildByName('Canvas');
  }

  // 处理点击事件
  onTouchStart(event: EventTouch) {
    // 获取点击位置（屏幕坐标）
    const eventPos = event.getUILocation();

    // 获取主摄像机
    const camera =
      this._camera || director.getScene().getComponentInChildren(Camera);
    if (!camera) {
      console.warn('未找到摄像机组件');
      return;
    }

    const canvasUITransform = this.getListenNode().getComponent(UITransform);
    const worldPos = canvasUITransform.convertToNodeSpaceAR(
      new Vec3(eventPos.x, eventPos.y, 0)
    );
    // 考虑摄像机偏移
    if (this._camera) {
      const cameraPos = this._camera.node.getPosition();
      worldPos.x += cameraPos.x;
      worldPos.y += cameraPos.y;
    }

    // 修改节点坐标到点击位置
    this.node.setPosition(worldPos);
  }

  onDestroy() {
    // 移除事件监听
    const targetNode = this.getListenNode();
    if (targetNode && targetNode.isValid) {
      targetNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
      console.log(`已移除节点 "${targetNode.name}" 上的点击监听`);
    }
  }
}
