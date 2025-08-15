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
  @property(CCFloat)
  initRate: number = 0;

  private _rate: number = 0;

  start() {
    this._rate = this.initRate;
    this.resetProgress();
  }

  /**
   * 修复浮点数精度问题
   * @param num 需要修复的数字
   * @param precision 精度位数，默认1位小数
   */
  private fixFloatPrecision(num: number, precision: number = 1): number {
    return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
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
      // 修复浮点数精度问题
      this._rate = this.fixFloatPrecision(this._rate + rate);

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

  /**
   * 设置进度值（用于外部直接设置）
   * @param rate 进度值 (0-1)
   */
  setProgress(rate: number): void {
    this._rate = this.fixFloatPrecision(Math.max(0, Math.min(1, rate)));
    if (this.progressBar) {
      this.progressBar.setScale(this._rate, this.progressBar.scale.y, 1);
    }
  }

  /**
   * 获取当前进度值
   */
  getProgress(): number {
    return this._rate;
  }
}
