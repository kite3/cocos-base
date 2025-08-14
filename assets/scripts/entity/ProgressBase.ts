import { _decorator, Component, Node, tween, Vec3 } from "cc";
const { ccclass, property } = _decorator;

@ccclass("ProgressBase")
export class ProgressBase extends Component {
  @property(Node)
  progressBar: Node = null;

  start() {
    // 初始化进度条为0
    this.resetProgress();
  }

  /**
   * 重置进度条
   */
  resetProgress(): void {
    if (this.progressBar) {
      this.progressBar.setScale(0, 1, 1);
    }
  }

  /**
   * 播放进度条动画
   * @param time 进度条播放时长（秒）
   */
  init(time: number = 1): Promise<void> {
    return new Promise((resolve) => {
      if (!this.progressBar) {
        resolve();
        return;
      }

      // 重置进度条
      this.resetProgress();

      // 播放进度条动画
      tween(this.progressBar)
        .to(
          time,
          { scale: new Vec3(1, 1, 1) },
          {
            easing: "linear", // 线性进度，也可以改为其他缓动效果
          }
        )
        .call(() => {
          resolve();
        })
        .start();
    });
  }
}
