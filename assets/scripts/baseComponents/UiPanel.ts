import { _decorator, Component, Node, Enum, TweenEasing } from 'cc';
import {
  UIManager,
  UIAnimationType,
  showUI,
  UIEvent,
  hideUI
} from '../baseManager/UIManager';
import { UILayer, globalEvent, GlobalEvent } from '../global';
const { ccclass, property } = _decorator;
export enum Easing {
  backOut = 'backOut',
  backIn = 'backIn',
  bounceOut = 'bounceOut',
  bounceIn = 'bounceIn',
  quadOut = 'quadOut',
  quadIn = 'quadIn',
  cubicOut = 'cubicOut',
  cubicIn = 'cubicIn',
  quarticOut = 'quarticOut',
  quarticIn = 'quarticIn',
  quinticOut = 'quinticOut',
  linear = 'linear'
}

@ccclass('UiPanel')
export class UiPanel extends Component {
  @property({
    type: Number,
    displayName: '停留时间',
    tooltip: '停留时间，0表示不自动隐藏'
  })
  private displayTime: number = 0;

  @property({
    type: Number,
    displayName: '动画时长',
    tooltip: '动画时长'
  })
  private animationDuration: number = 0.5;

  @property({
    type: Boolean,
    displayName: '是否显示',
    tooltip: '是否显示'
  })
  private isShow: boolean = false;

  @property({
    type: Boolean,
    displayName: '是否单例',
    tooltip: '是否单例'
  })
  private isSingle: boolean = false;

  @property({
    type: Enum(UILayer),
    displayName: 'UI层级',
    tooltip: 'UI层级'
  })
  private layer: UILayer = UILayer.UI;

  @property({
    type: [Enum(UIAnimationType)],
    displayName: 'UI显示动画类型',
    tooltip: 'UI显示动画类型，为空会不播放动画'
  })
  private uiAnimationType: UIAnimationType[] = [UIAnimationType.FADE];

  @property({
    type: [Enum(UIAnimationType)],
    displayName: 'UI隐藏动画类型',
    tooltip: 'UI隐藏动画类型，为空会继承UI显示动画类型'
  })
  private uiHideAnimationType: UIAnimationType[] = [];

  @property({
    type: [Enum(GlobalEvent)],
    displayName: '显示触发事件',
    tooltip: '显示触发事件'
  })
  private showEvents: GlobalEvent[] = [];

  @property({
    type: [Enum(GlobalEvent)],
    displayName: '隐藏触发事件',
    tooltip: '隐藏触发事件'
  })
  private hideEvents: GlobalEvent[] = [];

  @property({
    type: Boolean,
    displayName: '隐藏不销毁',
    tooltip:
      '隐藏不销毁，为true时，隐藏后会保留节点，为false时，隐藏后会销毁节点'
  })
  private isCache: boolean = true;

  @property({
    type: Boolean,
    displayName: '是否弹窗',
    tooltip: '是否弹窗，为true时，会自动显示mask，为false时，不会自动显示mask'
  })
  private isDialog: boolean = false;

  @property({
    type: Enum(Easing),
    displayName: '动画缓动',
    tooltip: '动画缓动'
  })
  private easing: TweenEasing = 'quadOut';
  @property({
    type: Enum(Easing),
    displayName: '隐藏动画缓动',
    tooltip: '隐藏动画缓动'
  })
  private hideEasing: TweenEasing = 'quadOut';

  @property({
    type: Number,
    displayName: '显示延迟时间',
    tooltip: '显示延迟时间'
  })
  private delayTime: number = 0;

  @property({
    type: Node,
    displayName: '跟随显示节点',
    tooltip: '跟随显示节点，为空时，不跟随显示'
  })
  private followShowNode: Node = null;

  protected onLoad(): void {
    UIManager.instance.registerUINode(this.node, {
      animation: this.uiAnimationType.map(type => ({
        type,
        duration: this.animationDuration,
        delay: this.delayTime,
        easing: this.easing
      })),
      hideAnimation:
        this.uiHideAnimationType.length > 0
          ? this.uiHideAnimationType.map(type => ({
              type,
              duration: this.animationDuration,
              delay: 0,
              easing: this.hideEasing
            }))
          : null,
      displayTime: this.displayTime,
      single: this.isSingle,
      layer: this.layer,
      cache: this.isCache,
      onShow: () => {
        if (this.showEvents.length > 0) {
          this.showEvents.forEach(event => {
            globalEvent.emit(event);
          });
        }
      },
      onHide: () => {
        if (this.hideEvents.length > 0) {
          this.hideEvents.forEach(event => {
            globalEvent.emit(event);
          });
        }
      },
      onBeforeShow: () => {
        if (this.isDialog) {
          showUI('DialogMask');
        }
      },
      onBeforeHide: () => {
        if (this.isDialog) {
          hideUI('DialogMask');
        }
      }
    });

    if (this.isShow || this.followShowNode) {
      showUI(this.node.name);
    } else {
      this.node.active = false;
    }
    if (this.followShowNode) {
      globalEvent.on(UIEvent.SHOW_START, (uiName: string) => {
        if (uiName === this.followShowNode?.name) {
          this.show();
        }
      });
      globalEvent.on(UIEvent.HIDE_START, (uiName: string) => {
        if (uiName === this.followShowNode?.name) {
          this.hide();
        }
      });
    }
  }

  show() {
    showUI(this.node.name);
  }

  hide() {
    hideUI(this.node.name);
  }
  start() {}

  update(deltaTime: number) {}
}
