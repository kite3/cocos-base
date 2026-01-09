import {
  _decorator,
  Component,
  Node,
  Vec3,
  Enum,
  Animation,
  AnimationClip,
  CCBoolean,
  CCInteger
} from 'cc';
const { ccclass, property, menu } = _decorator;
import {
  globalEvent,
  GlobalEvent,
  AUDIO_ENUM
} from 'db://assets/scripts/global';
import { playOneShot } from 'db://assets/core/scripts/baseManager/AudioManager';
import { showUI, hideUI, getUI } from 'db://assets/core/scripts/baseManager/UIManager';

@ccclass('AnimationPlus')
@menu('37组件/基础组件/剪辑Plus')
export class AnimationPlus extends Component {
  @property({
    type: Enum(GlobalEvent),
    displayName: '播放结束时触发事件',
    tooltip: '播放结束时触发事件'
  })
  private triggerEvent: GlobalEvent = GlobalEvent.NONE;

  @property({
    type: [Node],
    displayName: '播放结束时显示的节点数组',
    tooltip: '播放结束时显示的节点数组'
  })
  private triggerShowNode: Node[] = [];

  @property({
    type: [Node],
    displayName: '播放结束时隐藏的节点数组',
    tooltip: '播放结束时隐藏的节点数组'
  })
  private triggerHideNode: Node[] = [];

  @property({
    displayName: '是否循环播放',
    tooltip: '是否循环播放'
  })
  private isLoop = true;

  @property({
    type: CCInteger,
    displayName: '播放次数',
    tooltip:
      '动画需要播放的次数，达到此次数后才算结束，默认1次（仅非循环模式生效）',
    visible: function () {
      return !this.isLoop;
    }
  })
  private playCount: number = 1;

  @property({
    displayName: '是否在播放结束时隐藏节点',
    tooltip: '是否在播放结束时隐藏节点'
  })
  private isHideWhenEnd = true;

  @property({
    displayName: '是否在播放结束时销毁节点',
    tooltip: '是否在播放结束时销毁节点'
  })
  private isDestroyNodeWhenEnd = false;

  @property({
    type: Enum(AUDIO_ENUM),
    displayName: '开始播放时触发的音频',
    tooltip: '开始播放时触发的音频'
  })
  private startTriggerEvent: string = GlobalEvent.NONE;

  private _currentPlayCount: number = 0;
  private _animation: Animation = null;

  onLoad() {
    this.bindGlobalEvent();
    this.init();
  }

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  init() {
    this._currentPlayCount = 0;

    this._animation = this.node.getComponent(Animation);
    if (this._animation.defaultClip) {
      this._animation.defaultClip.wrapMode = this.isLoop
        ? AnimationClip.WrapMode.Loop
        : AnimationClip.WrapMode.Default;
    }

    if (!this.isLoop) {
      this._animation.on(
        Animation.EventType.FINISHED,
        this.onAnimationCycleEnd,
        this
      );
    }

    this._animation.on(Animation.EventType.PLAY, this.playStartShot, this);
  }

  onAnimationCycleEnd() {
    if (!this.isLoop) {
      this._currentPlayCount++;
      if (this._currentPlayCount >= this.playCount) {
        this.triggerAnimationEnd();
      } else {
        this._animation.play();
        this.playStartShot();
      }
    }
  }
  playStartShot() {
    if (this.startTriggerEvent !== AUDIO_ENUM.NONE) {
      playOneShot(this.startTriggerEvent);
    }
  }

  triggerAnimationEnd() {
    if (this.triggerEvent !== GlobalEvent.NONE) {
      globalEvent.emit(this.triggerEvent);
    }
    this.triggerShowNode.forEach(node => {
      if (getUI(node.name)) {
        showUI(node.name);
      } else {
        node.active = true;
      }
    });
    this.triggerHideNode.forEach(node => {
      if (getUI(node.name)) {
        hideUI(node.name);
      } else {
        node.active = false;
      }
    });
    this._animation.stop();
    this._animation = null;
    if (this.isHideWhenEnd) {
      this.node.active = false;
    }
    if (this.isDestroyNodeWhenEnd) {
      this.node.destroy();
    }
  }

  protected onDestroy(): void {
    if (this._animation) {
      this._animation.off(
        Animation.EventType.FINISHED,
        this.onAnimationCycleEnd,
        this
      );
      this._animation.off(Animation.EventType.PLAY, this.playStartShot, this);
      this._animation = null;
    }
  }
}
