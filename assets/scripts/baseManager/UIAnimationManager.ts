/**
 * UI动画管理器 - 专门处理UI动画效果
 */

import { tween, Node, TweenEasing, Vec3, UIOpacity, UITransform } from 'cc';

// UI动画类型
export enum UIAnimationType {
  NONE = 'none', // 无动画
  FADE = 'fade', // 淡入淡出
  SCALE = 'scale', // 缩放
  SLIDE_LEFT = 'slideLeft', // 从左滑入
  SLIDE_RIGHT = 'slideRight', // 从右滑入
  SLIDE_TOP = 'slideTop', // 从上滑入
  SLIDE_BOTTOM = 'slideBottom', // 从下滑入
  FLIP_X = 'flipX', // 水平翻转
  FLIP_Y = 'flipY', // 垂直翻转
  FLIP_XY = 'flipXY' // 水平垂直同时翻转
}

// 动画配置接口
export interface UIAnimationConfig {
  type: UIAnimationType; // 动画类型
  duration?: number; // 动画持续时间（毫秒）
  delay?: number; // 延迟时间（毫秒）
  easing?: TweenEasing; // 缓动函数
  from?: Vec3 | number; // 初始值
  to?: Vec3 | number; // 目标值
}

export interface UINodeConfig {
  position: Vec3;
  scale: Vec3;
  opacity: number;
}

export class UIAnimationManager {
  private nodeMap: Map<Node, UINodeConfig> = new Map();

  private static _instance: UIAnimationManager;

  private constructor() {}

  public static get instance(): UIAnimationManager {
    if (!this._instance) {
      this._instance = new UIAnimationManager();
    }
    return this._instance;
  }

  /**
   * 播放动画（支持单个或多个动画配置）
   * @param node 目标节点
   * @param config 动画配置或动画配置数组
   * @param isShow 是否是显示动画
   * @param mode 播放模式：并行或串行
   */
  public async playAnimations(
    node: Node,
    config: UIAnimationConfig | UIAnimationConfig[],
    isShow: boolean,
    mode: 'parallel' | 'sequence' = 'parallel'
  ): Promise<void> {
    // 如果是单个动画配置，直接调用单个动画播放
    if (!Array.isArray(config)) {
      return this.playAnimation(node, config, isShow);
    }

    // 如果是动画数组
    if (config.length === 0) {
      node.active = true;
      return;
    }

    if (mode === 'sequence') {
      // 串行播放：一个接一个
      for (const animConfig of config) {
        await this.playAnimation(node, animConfig, isShow);
      }
      node.active = isShow ? true : false;
    } else {
      // 并行播放：同时播放所有动画
      const animationPromises = config.map(animConfig =>
        this.playAnimation(node, animConfig, isShow)
      );
      await Promise.all(animationPromises);
      node.active = isShow ? true : false;
    }
  }

  /**
   * 播放单个动画
   * @param node 目标节点
   * @param config 动画配置
   * @param isShow 是否是显示动画
   */
  public async playAnimation(
    node: Node,
    config: UIAnimationConfig,
    isShow: boolean
  ): Promise<void> {
    node.active = true;
    this.initInitialState(node, config, isShow);
    const duration = config.duration || 300;
    const delay = config.delay || 0;
    const easing: TweenEasing = config.easing || 'quadOut';

    const { from, to } = this.getAnimationFromTo(node, config, isShow);

    return new Promise(resolve => {
      let target: UIOpacity | Node = node;
      let toProperty: string;

      switch (config.type) {
        case UIAnimationType.FADE:
          target = node.getComponent(UIOpacity);
          target.opacity = from as number;
          toProperty = 'opacity';
          break;
        case UIAnimationType.SCALE:
          target.setScale(from as Vec3);
          toProperty = 'scale';
          break;
        case UIAnimationType.SLIDE_LEFT:
        case UIAnimationType.SLIDE_RIGHT:
        case UIAnimationType.SLIDE_TOP:
        case UIAnimationType.SLIDE_BOTTOM:
          target.setPosition(from as Vec3);
          toProperty = 'position';
          break;
        case UIAnimationType.FLIP_X:
        case UIAnimationType.FLIP_Y:
        case UIAnimationType.FLIP_XY:
          target.setScale(from as Vec3);
          toProperty = 'scale';
          break;
      }
      tween(target)
        .delay(delay)
        .to(
          duration,
          {
            [toProperty]: to
          },
          {
            easing,
            onComplete: () => {
              resolve();
            }
          }
        )
        .start();
    });
  }

  /**
   * 播放显示动画
   * @param node 目标节点
   * @param config 动画配置或动画配置数组
   * @param mode 播放模式：并行或串行
   */
  public async playShowAnimation(
    node: Node,
    config: UIAnimationConfig | UIAnimationConfig[],
    mode: 'parallel' | 'sequence' = 'parallel'
  ): Promise<void> {
    return this.playAnimations(node, config, true, mode);
  }

  /**
   * 播放隐藏动画
   * @param node 目标节点
   * @param config 动画配置或动画配置数组
   * @param mode 播放模式：并行或串行
   */
  public async playHideAnimation(
    node: Node,
    config: UIAnimationConfig | UIAnimationConfig[],
    mode: 'parallel' | 'sequence' = 'parallel'
  ): Promise<void> {
    return this.playAnimations(node, config, false, mode);
  }

  /**
   * 停止节点上的所有动画
   * @param node 目标节点
   */
  public stopAllAnimations(node: Node): void {
    tween(node).stop();
    const uiOpacity = node.getComponent(UIOpacity);
    if (uiOpacity) {
      tween(uiOpacity).stop();
    }
  }

  public initInitialState(
    node: Node,
    config: UIAnimationConfig,
    isShow: boolean
  ): void {
    if (config.type === UIAnimationType.FADE && !node.getComponent(UIOpacity)) {
      node.addComponent(UIOpacity);
    }
    if (this.nodeMap.has(node)) {
      return;
    }

    this.nodeMap.set(node, {
      position: node.getPosition().clone(),
      scale: node.getScale().clone(),
      opacity: node.getComponent(UIOpacity)?.opacity || 0
    });
  }

  public getAnimationFromTo(
    node: Node,
    config: UIAnimationConfig,
    isShow: boolean
  ): { from: Vec3 | number; to: Vec3 | number } {
    if (config.from && config.to) {
      return { from: config.from, to: config.to };
    }

    const pos = this.nodeMap.get(node).position.clone();
    const scale = this.nodeMap.get(node).scale.clone();
    const opacity = this.nodeMap.get(node).opacity;

    const SLIDE_OFFSET = 100;
    switch (config.type) {
      case UIAnimationType.FADE:
        return { from: isShow ? 0 : opacity, to: isShow ? opacity : 0 };
      case UIAnimationType.SCALE:
        return {
          from: isShow ? new Vec3(0, 0, 0) : scale,
          to: isShow ? scale : new Vec3(0, 0, 0)
        };
      case UIAnimationType.SLIDE_LEFT:
        return {
          from: isShow ? new Vec3(pos.x - SLIDE_OFFSET, pos.y, pos.z) : pos,
          to: isShow ? pos : new Vec3(pos.x - SLIDE_OFFSET, pos.y, pos.z)
        };
      case UIAnimationType.SLIDE_RIGHT:
        return {
          from: isShow ? new Vec3(pos.x + SLIDE_OFFSET, pos.y, pos.z) : pos,
          to: isShow ? pos : new Vec3(pos.x + SLIDE_OFFSET, pos.y, pos.z)
        };
      case UIAnimationType.SLIDE_TOP:
        return {
          from: isShow ? new Vec3(pos.x, pos.y - SLIDE_OFFSET, pos.z) : pos,
          to: isShow ? pos : new Vec3(pos.x, pos.y - SLIDE_OFFSET, pos.z)
        };
      case UIAnimationType.SLIDE_BOTTOM:
        return {
          from: isShow ? new Vec3(pos.x, pos.y + SLIDE_OFFSET, pos.z) : pos,
          to: isShow ? pos : new Vec3(pos.x, pos.y + SLIDE_OFFSET, pos.z)
        };
      case UIAnimationType.FLIP_X:
        return {
          from: isShow ? new Vec3(0, scale.y, scale.z) : scale,
          to: isShow ? scale : new Vec3(0, scale.y, scale.z)
        };
      case UIAnimationType.FLIP_Y:
        return {
          from: isShow ? new Vec3(scale.x, 0, scale.z) : scale,
          to: isShow ? scale : new Vec3(scale.x, 0, scale.z)
        };
      case UIAnimationType.FLIP_XY:
        return {
          from: isShow ? new Vec3(0, 0, scale.z) : scale,
          to: isShow ? scale : new Vec3(0, 0, scale.z)
        };
      default:
        console.warn(
          `UIAnimationManager: getAnimationFromTo: unknown animation type: ${config.type}`
        );
        return { from: 0, to: 0 };
    }
  }
}

// 导出便捷函数
export const fadeIn = (
  node: Node,
  duration: number = 300,
  delay: number = 0
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, {
    type: UIAnimationType.FADE,
    duration,
    delay
  });
};

export const fadeOut = (
  node: Node,
  duration: number = 300,
  delay: number = 0
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, {
    type: UIAnimationType.FADE,
    duration,
    delay
  });
};

export const scaleIn = (
  node: Node,
  duration: number = 300,
  delay: number = 0,
  easing: TweenEasing = 'backOut'
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, {
    type: UIAnimationType.SCALE,
    duration,
    delay,
    easing
  });
};

export const scaleOut = (
  node: Node,
  duration: number = 300,
  delay: number = 0,
  easing: TweenEasing = 'backIn'
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, {
    type: UIAnimationType.SCALE,
    duration,
    delay,
    easing
  });
};

export const slideIn = (
  node: Node,
  direction: 'left' | 'right' | 'top' | 'bottom',
  duration: number = 300,
  delay: number = 0,
  easing: TweenEasing = 'quadOut'
): Promise<void> => {
  const typeMap = {
    left: UIAnimationType.SLIDE_LEFT,
    right: UIAnimationType.SLIDE_RIGHT,
    top: UIAnimationType.SLIDE_TOP,
    bottom: UIAnimationType.SLIDE_BOTTOM
  };

  return UIAnimationManager.instance.playShowAnimation(node, {
    type: typeMap[direction],
    duration,
    delay,
    easing
  });
};

export const slideOut = (
  node: Node,
  direction: 'left' | 'right' | 'top' | 'bottom',
  duration: number = 300,
  delay: number = 0,
  easing: TweenEasing = 'quadIn'
): Promise<void> => {
  const typeMap = {
    left: UIAnimationType.SLIDE_LEFT,
    right: UIAnimationType.SLIDE_RIGHT,
    top: UIAnimationType.SLIDE_TOP,
    bottom: UIAnimationType.SLIDE_BOTTOM
  };

  return UIAnimationManager.instance.playHideAnimation(node, {
    type: typeMap[direction],
    duration,
    delay,
    easing
  });
};

export const stopAllAnimations = (node: Node): void => {
  return UIAnimationManager.instance.stopAllAnimations(node);
};

export const playAnimation = (
  node: Node,
  config: UIAnimationConfig,
  isShow: boolean
): Promise<void> => {
  return UIAnimationManager.instance.playAnimation(node, config, isShow);
};

export const playAnimations = (
  node: Node,
  config: UIAnimationConfig | UIAnimationConfig[],
  isShow: boolean,
  mode: 'parallel' | 'sequence' = 'parallel'
): Promise<void> => {
  return UIAnimationManager.instance.playAnimations(node, config, isShow, mode);
};

export const playShowAnimation = (
  node: Node,
  config: UIAnimationConfig | UIAnimationConfig[],
  mode: 'parallel' | 'sequence' = 'parallel'
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, config, mode);
};

export const playHideAnimation = (
  node: Node,
  config: UIAnimationConfig | UIAnimationConfig[],
  mode: 'parallel' | 'sequence' = 'parallel'
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, config, mode);
};

export const flipInX = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadOut'
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, {
    type: UIAnimationType.FLIP_X,
    duration,
    delay,
    easing
  });
};

export const flipOutX = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadIn'
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, {
    type: UIAnimationType.FLIP_X,
    duration,
    delay,
    easing
  });
};

export const flipInY = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadOut'
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, {
    type: UIAnimationType.FLIP_Y,
    duration,
    delay,
    easing
  });
};

export const flipOutY = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadIn'
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, {
    type: UIAnimationType.FLIP_Y,
    duration,
    delay,
    easing
  });
};

export const flipInXY = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadOut'
): Promise<void> => {
  return UIAnimationManager.instance.playShowAnimation(node, {
    type: UIAnimationType.FLIP_XY,
    duration,
    delay,
    easing
  });
};

export const flipOutXY = (
  node: Node,
  duration: number = 1,
  delay: number = 0,
  easing: TweenEasing = 'quadIn'
): Promise<void> => {
  return UIAnimationManager.instance.playHideAnimation(node, {
    type: UIAnimationType.FLIP_XY,
    duration,
    delay,
    easing
  });
};
