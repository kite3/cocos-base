import { _decorator, CCFloat, Component, Node, tween, Vec3 } from 'cc';
import { getContentSizeWithScale, setAnchorPoint } from '../utils/common';
import { globalEvent, GlobalEvent } from '../global';
const { ccclass, property } = _decorator;

@ccclass('ProgressBase')
export class ProgressBase extends Component {
  @property(Node)
  progressBar: Node = null;
  @property(CCFloat)
  offsetY: number = 0;

  private _rate: number = 0;

  start() {
    this.resetProgress();
    // globalEvent.on(GlobalEvent.ADD_PROGRESS, this.addProgress, this);
  }

  onDestroy() {
    // globalEvent.off(GlobalEvent.ADD_PROGRESS, this.addProgress, this);
  }

  /**
   * 重置进度条
   */
  resetProgress(): void {
    if (this.progressBar) {
      setAnchorPoint(this.progressBar, 0, 1);
      this.progressBar.setPosition(
        this.progressBar.position.x -
          getContentSizeWithScale(this.progressBar).width / 2,
        this.progressBar.position.y + this.offsetY,
        0
      );
      this.progressBar.setScale(this._rate, 1, 1);
    }
  }

  /**
   * 添加进度
   * @param time 进度条播放时长（秒）
   * @param rate 进度条增加的进度
   */
  addProgress(time: number = 0.3, rate: number = 0.1): Promise<number> {
    return new Promise(resolve => {
      this._rate += rate;
      if (this._rate > 1) {
        this._rate = 1;
      }

      // 如果时间等于0，则直接设置进度条的缩放
      if (time === 0) {
        this.progressBar.setScale(this._rate, this.progressBar.scale.y, 1);
        resolve(this._rate);
        return;
      }

      tween(this.progressBar)
        .to(
          time,
          { scale: new Vec3(this._rate, this.progressBar.scale.y, 1) },
          {
            easing: 'linear'
          }
        )
        .call(() => {
          resolve(this._rate);
        })
        .start();
    });
  }
}
