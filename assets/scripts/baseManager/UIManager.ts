/**
 * UI管理器 - 管理游戏中所有UI界面的显示、隐藏、层级等
 */

import { globalEvent } from '../global';
import { Node } from 'cc';
import {
  UIAnimationManager,
  UIAnimationConfig,
  UIAnimationType
} from './UIAnimationManager';

// 重新导出动画相关类型和枚举，方便外部使用
export type { UIAnimationConfig } from './UIAnimationManager';
export { UIAnimationType, UIAnimationManager } from './UIAnimationManager';

// UI节点事件
export enum UINodeEvent {
  SHOW = 'show', // 显示事件
  SHOWN = 'shown', // 显示完成事件
  HIDE = 'hide', // 隐藏事件
  HIDDEN = 'hidden', // 隐藏完成事件
  DISPOSE = 'dispose' // 销毁事件
}

// UI界面的基础配置接口
export interface UIConfig {
  layer?: number; // UI层级
  cache?: boolean; // 是否缓存
  single?: boolean; // 是否为单例
  animation?: UIAnimationConfig | UIAnimationConfig[]; // 动画配置，支持单个或多个动画
  hideAnimation?: UIAnimationConfig | UIAnimationConfig[]; // 隐藏动画配置，支持单个或多个动画
  animationMode?: 'parallel' | 'sequence'; // 动画播放模式：并行或串行（默认并行）
  displayTime?: number; // 显示时间（毫秒），默认0表示永久显示，大于0则在指定时间后自动隐藏
  onShow?: (node: Node) => void; // 显示回调
  onHide?: (node: Node) => void; // 隐藏回调
  onBeforeShow?: (node: Node) => void; // 显示前回调
  onBeforeHide?: (node: Node) => void; // 隐藏前回调
}

// UI事件类型
export enum UIEvent {
  SHOW_START = 'UI_SHOW_START',
  SHOW_END = 'UI_SHOW_END',
  HIDE_START = 'UI_HIDE_START',
  HIDE_END = 'UI_HIDE_END'
}

export class UIManager {
  private static _instance: UIManager;
  private _uiMap: Map<string, Node>;
  private _uiConfigs: Map<string, UIConfig>;
  private _autoHideTimers: Map<string, any>; // 存储自动隐藏定时器

  private constructor() {
    this._uiMap = new Map();
    this._uiConfigs = new Map();
    this._autoHideTimers = new Map();
  }

  public static get instance(): UIManager {
    if (!this._instance) {
      this._instance = new UIManager();
    }
    return this._instance;
  }

  /**
   * 注册UI配置和节点
   * @param uiName UI名称
   * @param node UI节点
   * @param config UI配置
   */
  public registerUI(uiName: string, node: Node, config: UIConfig): void {
    if (this._uiConfigs.has(uiName)) {
      console.warn(`UI ${uiName} 已经注册过了`);
      return;
    }
    this._uiConfigs.set(uiName, config);
    this._uiMap.set(uiName, node);

    // 设置初始状态为隐藏
    node.active = false;

    // // 设置层级
    // if (config.layer !== undefined) {
    //   node.setSiblingIndex(config.layer);
    // }
  }

  /**
   * 注册UI配置和节点
   * @param node UI节点
   * @param config UI配置
   */
  public registerUINode(node: Node, config: UIConfig): void {
    this.registerUI(node.name, node, config);
  }

  /**
   * 显示UI
   * @param uiName UI名称
   * @returns Promise<UINode>
   */
  public async showUI(
    uiName: string,
    onShow?: (node: Node) => void
  ): Promise<Node> {
    const config = this._uiConfigs.get(uiName);
    const node = this._uiMap.get(uiName);

    if (!config) {
      throw new Error(`UI ${uiName} 未注册`);
    }

    if (!node) {
      throw new Error(`UI ${uiName} 的节点未找到`);
    }

    // 如果已经在显示，直接返回
    if (node.active) {
      return node;
    }

    globalEvent.emit(UIEvent.SHOW_START, uiName);
    node.emit?.(UINodeEvent.SHOW);

    config.onBeforeShow?.(node);

    // 处理单例UI
    if (config.single) {
      // 隐藏同层级的其他UI
      await this._hideUIsByLayer(config.layer || 0);
    }
    // 播放显示动画
    if (config.animation) {
      await UIAnimationManager.instance.playAnimations(
        node,
        config.animation,
        true,
        config.animationMode
      );
    } else {
      node.active = true;
    }

    onShow?.(node);
    config.onShow?.(node);

    // 设置自动隐藏定时器
    if (config.displayTime && config.displayTime > 0) {
      // 清除之前的定时器（如果存在）
      this._clearAutoHideTimer(uiName);

      // 设置新的定时器
      const timerId = setTimeout(() => {
        this.hideUI(uiName);
        this._autoHideTimers.delete(uiName);
      }, config.displayTime * 1000);

      this._autoHideTimers.set(uiName, timerId);
    }

    globalEvent.emit(UIEvent.SHOW_END, uiName);
    node.emit?.(UINodeEvent.SHOWN);

    return node;
  }

  public async showUINode(node: Node): Promise<Node> {
    return this.showUI(node.name);
  }
  /**
   * 隐藏UI
   * @param uiName UI名称
   */
  public async hideUI(
    uiName: string,
    onHide?: (node: Node) => void
  ): Promise<void> {
    const node = this._uiMap.get(uiName);
    const config = this._uiConfigs.get(uiName);
    if (!node || !node.active || !config) {
      return;
    }

    // 清除自动隐藏定时器
    this._clearAutoHideTimer(uiName);

    globalEvent.emit(UIEvent.HIDE_START, uiName);
    node.emit?.(UINodeEvent.HIDE);

    config.onBeforeHide?.(node);

    const animation = config.hideAnimation || config.animation;

    // 播放隐藏动画
    if (animation) {
      await UIAnimationManager.instance.playAnimations(
        node,
        animation,
        false,
        config.animationMode
      );

      node.active = false;
    } else {
      node.active = false;
    }
    onHide?.(node);
    config.onHide?.(node);

    globalEvent.emit(UIEvent.HIDE_END, uiName);
    node.emit?.(UINodeEvent.HIDDEN);

    if (!config.cache) {
      this.disposeUI(uiName);
    }
  }

  public async hideUINode(node: Node): Promise<void> {
    return this.hideUI(node.name);
  }

  /**
   * 销毁UI
   * @param uiName UI名称
   */
  public disposeUI(uiName: string): void {
    const node = this._uiMap.get(uiName);
    if (!node) return;

    // 清除自动隐藏定时器
    this._clearAutoHideTimer(uiName);

    node.emit?.(UINodeEvent.DISPOSE);
    node.destroy?.();
    this._uiMap.delete(uiName);
  }
  public disposeUINode(node: Node): void {
    this.disposeUI(node.name);
  }

  /**
   * 获取UI节点
   * @param uiName UI名称
   * @returns UINode | undefined
   */
  public getUI(uiName: string): Node | undefined {
    return this._uiMap.get(uiName);
  }
  public getUINode(uiName: string): Node | undefined {
    return this._uiMap.get(uiName);
  }

  public getUIConfig(uiName: string): UIConfig | undefined {
    return this._uiConfigs.get(uiName);
  }

  /**
   * 清理所有UI
   */
  public clear(): void {
    // 清除所有自动隐藏定时器
    for (const [uiName] of this._autoHideTimers) {
      this._clearAutoHideTimer(uiName);
    }

    for (const [uiName, node] of this._uiMap) {
      node.destroy?.();
    }
    this._uiMap.clear();
  }

  /**
   * 隐藏指定层级的UI
   * @param layer 层级
   */
  private async _hideUIsByLayer(layer: number): Promise<void> {
    for (const [uiName, node] of this._uiMap) {
      const config = this._uiConfigs.get(uiName);
      if (config && config.layer === layer && node.active) {
        await this.hideUI(uiName);
      }
    }
  }

  /**
   * 动画管理器实例（委托给 UIAnimationManager）
   */
  public get animation(): UIAnimationManager {
    return UIAnimationManager.instance;
  }

  /**
   * 清除自动隐藏定时器
   * @param uiName UI名称
   */
  private _clearAutoHideTimer(uiName: string): void {
    const timerId = this._autoHideTimers.get(uiName);
    if (timerId) {
      clearTimeout(timerId);
      this._autoHideTimers.delete(uiName);
    }
  }
}

export const showUI = (uiName: string, onShow?: (node: Node) => void) => {
  UIManager.instance.showUI(uiName, onShow);
};

export const hideUI = (uiName: string, onHide?: (node: Node) => void) => {
  UIManager.instance.hideUI(uiName, onHide);
};
export const getUI = (uiName: string) => {
  return UIManager.instance.getUI(uiName);
};
export const getUIConfig = (uiName: string) => {
  return UIManager.instance.getUIConfig(uiName);
};
