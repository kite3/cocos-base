import { GAME_FIGURE_KEY } from '../global';
import { Node, director, Component } from 'cc';

export class FigureAnimationManager {
  private static _instance: FigureAnimationManager;
  private _animations: Map<string, any> = new Map();
  private _dummyComponent: Component;

  static get instance(): FigureAnimationManager {
    if (!this._instance) {
      this._instance = new FigureAnimationManager();
    }
    return this._instance;
  }

  constructor() {
    // 创建一个虚拟节点和组件用于定时器
    const dummyNode = new Node('FigureAnimationManager');
    this._dummyComponent = dummyNode.addComponent(Component);
    director.getScene()?.addChild(dummyNode);
  }

  /**
   * 更新游戏数值（带动画效果）
   * @param target 目标对象（gameFigure）
   * @param key 数值键（GAME_FIGURE_KEY）
   * @param targetValue 目标值
   * @param duration 动画时长（秒）
   * @param onComplete 完成回调
   */
  updateFigure(
    target: any,
    key: GAME_FIGURE_KEY,
    targetValue: number,
    duration: number = 1,
    onComplete?: () => void
  ) {
    const animationKey = `${key}`;

    // 如果已经有相同键的动画在运行，先停止它
    if (this._animations.has(animationKey)) {
      this.stopAnimation(animationKey);
    }

    const startValue = target[key];
    const startTime = Date.now();
    const durationMs = duration * 1000;

    const animation = {
      startTime,
      startValue,
      targetValue,
      duration: durationMs,
      target,
      key,
      onComplete,
      isRunning: true
    };

    this._animations.set(animationKey, animation);
    this.startAnimation(animationKey);
  }

  private startAnimation(animationKey: string) {
    const animation = this._animations.get(animationKey);
    if (!animation) return;

    // 使用Cocos的schedule定时器，每帧更新
    this._dummyComponent.schedule(() => {
      this.updateAnimation(animationKey);
    }, 0);
  }

  private updateAnimation(animationKey: string) {
    const animation = this._animations.get(animationKey);
    if (!animation || !animation.isRunning) return;

    const currentTime = Date.now();
    const elapsed = currentTime - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);

    // 使用缓动函数让动画更自然
    const easeProgress = this.easeOutCubic(progress);
    const currentValue = Math.floor(
      animation.startValue +
        (animation.targetValue - animation.startValue) * easeProgress
    );

    animation.target[animation.key] = currentValue;

    if (progress >= 1) {
      // 动画完成
      animation.target[animation.key] = animation.targetValue;
      animation.isRunning = false;
      this._animations.delete(animationKey);
      animation.onComplete?.();

      // 停止这个动画的定时器
      this._dummyComponent.unscheduleAllCallbacks();

      // 如果还有其他动画在运行，重新启动定时器
      if (this._animations.size > 0) {
        this._dummyComponent.schedule(() => {
          this.updateAllAnimations();
        }, 0);
      }
    }
  }

  private updateAllAnimations() {
    const animationKeys = Array.from(this._animations.keys());
    animationKeys.forEach(key => {
      this.updateAnimation(key);
    });
  }

  private stopAnimation(animationKey: string) {
    const animation = this._animations.get(animationKey);
    if (animation) {
      animation.isRunning = false;
      this._animations.delete(animationKey);
    }
  }

  // 缓动函数，让动画更自然
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // 清理所有动画
  clearAllAnimations() {
    this._animations.forEach((animation, key) => {
      animation.isRunning = false;
    });
    this._animations.clear();
    this._dummyComponent.unscheduleAllCallbacks();
  }

  // 销毁管理器
  destroy() {
    this.clearAllAnimations();
    if (
      this._dummyComponent &&
      this._dummyComponent.node &&
      this._dummyComponent.node.isValid
    ) {
      this._dummyComponent.node.destroy();
    }
  }
}

// 导出便捷函数
export const updateFigure = (
  target: any,
  key: GAME_FIGURE_KEY,
  targetValue: number,
  duration: number = 1,
  onComplete?: () => void
) => {
  FigureAnimationManager.instance.updateFigure(
    target,
    key,
    targetValue,
    duration,
    onComplete
  );
};
