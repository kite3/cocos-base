import {
  _decorator,
  Component,
  find,
  Node,
  tween,
  UITransform,
  Vec3
} from 'cc';
import { globalEvent } from '../global';
import { GlobalEvent } from '../global';
const { ccclass, property } = _decorator;

@ccclass('FingerGuide')
export class FingerGuide extends Component {
  @property(Node)
  btnNode: Node = null;

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();
  private _currentTween: any = null; // 保存当前运行的动画

  start() {
    this._initPosition = this.node.position.clone();
    this._initScale = this.node.getScale().clone();
    this.showFinger();
    // globalEvent.on(GlobalEvent.HIDE_FINGER, this.destroyFinger, this);
    // globalEvent.on(GlobalEvent.SHOW_FINGER, this.showFinger, this);
  }

  onDestroy() {
    // 停止当前运行的动画
    if (this._currentTween) {
      this._currentTween.stop();
      this._currentTween = null;
    }

    // globalEvent.off(GlobalEvent.HIDE_FINGER, this.destroyFinger, this);
    // globalEvent.off(GlobalEvent.SHOW_FINGER, this.showFinger, this);
  }

  showFinger() {
    this.node.active = true;
    this.node.parent.active = true;
    this._showFinger({
      targetNode: this.btnNode,
      offset: { x: -40, y: -50 }
    });
  }

  _showFinger({
    targetNode,
    offset = { x: 0, y: 0 }
  }: {
    targetNode: Node;
    offset?: { x: number; y: number };
    parentNode?: Node;
  }) {
    const fingerNode = this.node;
    console.warn('手指引导', fingerNode.name);

    // 停止当前运行的动画
    if (this._currentTween) {
      this._currentTween.stop();
      this._currentTween = null;
    }

    const targetWorldPos = targetNode.getWorldPosition();
    const parentNode = this.node.parent;
    const localPos = parentNode
      .getComponent(UITransform)
      .convertToNodeSpaceAR(targetWorldPos);

    // 计算目标节点的边界
    const targetUITransform = targetNode.getComponent(UITransform);
    const targetWidth = targetUITransform.width;
    const targetHeight = targetUITransform.height;

    // 计算最终位置（包含偏移）
    const centerX = localPos.x;
    const centerY = localPos.y;

    // 右下角起始位置
    const rightBottomX = centerX + targetWidth / 2 + offset.x;
    const rightBottomY = centerY - targetHeight / 2 + offset.y;

    // 小幅度左上移动的目标位置
    const moveDistance = 30; // 移动距离，可以根据需要调整
    const leftTopX = rightBottomX - moveDistance;
    const leftTopY = rightBottomY + moveDistance;

    // 设置手指初始位置（右下角）
    fingerNode.setPosition(rightBottomX, rightBottomY, 0);
    parentNode.addChild(fingerNode);

    // 创建手指小幅度往左上角移动的动画
    this._currentTween = tween(fingerNode)
      .to(
        0.4,
        { position: new Vec3(leftTopX, leftTopY, 0) },
        {
          easing: 'sineInOut'
        }
      )
      .to(
        0.4,
        { position: new Vec3(rightBottomX, rightBottomY, 0) },
        {
          easing: 'sineInOut'
        }
      )
      .union()
      .repeatForever()
      .start();
  }

  destroyFinger() {
    // 停止当前运行的动画
    if (this._currentTween) {
      this._currentTween.stop();
      this._currentTween = null;
    }

    this.node.active = false;
    // 本次试玩专属
    this.node.parent.active = false;
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
  }
}
