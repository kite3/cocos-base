import { _decorator, CCFloat, Component, Node, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ScaleNode')
export class ScaleNode extends Component {
  private _tipTween: any = null;

  @property(CCFloat)
  maxScaleRate: number = 1.2;
  @property(CCFloat)
  scaleTime: number = 0.5;

  start() {
    this.startTextScaleAnim();
  }

  startTextScaleAnim() {
    // 获取原始缩放值
    const minScale = this.node.scale.x;
    const maxScale = minScale * this.maxScaleRate; // 在原始缩放基础上放大1.2倍

    // 先重置到初始状态，确保动画从头开始
    this.node.scale = new Vec3(minScale, minScale, 1);

    // 创建新的缩放动画
    this._tipTween = tween(this.node)
      .repeatForever(
        tween()
          .to(this.scaleTime, {
            scale: new Vec3(maxScale, maxScale, 1)
          })
          .to(this.scaleTime, { scale: new Vec3(minScale, minScale, 1) })
          .call(() => {
            // console.warn('call', this.node.name);
          })
      )
      .start();
  }

  stopTextScaleAnim() {
    if (this._tipTween) {
      this._tipTween.stop();
      this._tipTween = null;
      console.warn('stopTextScaleAnim', this.node.name);
    }

    // 确保节点缩放回到初始状态
    const originalScale = this.node.scale.x / this.maxScaleRate;
    this.node.scale = new Vec3(originalScale, originalScale, 1);
  }
}
