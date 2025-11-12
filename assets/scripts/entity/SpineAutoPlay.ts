import {
  _decorator,
  CCBoolean,
  CCFloat,
  CCString,
  Component,
  Enum,
  Node,
  sp,
  Vec3
} from 'cc';
const { ccclass, property } = _decorator;
import {
  globalEvent,
  GlobalEvent,
  AUDIO_ENUM,
  GAME_STATUS,
  getGameStatus,
  GAME_FIGURE_KEY,
  gameFigure
} from 'db://assets/scripts/global';
import {
  playOneShot,
  playShotMusic
} from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';
import { getSpineAnimationNames } from '../utils/common';

@ccclass('SpineAutoPlay')
export class SpineAutoPlay extends Component {
  @property(CCString)
  spineName: string = '';

  @property({
    type: Enum(AUDIO_ENUM)
  })
  audioName = AUDIO_ENUM.NONE;

  @property(CCFloat)
  audioVolume: number = 1.0;

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();
  onLoad() {
    this._initPosition = this.node.position.clone();
    this._initScale = this.node.getScale().clone();
    //通用组件模板，默认提供全局事件绑定、UI事件绑定、初始化方法
    this.bindGlobalEvent();
    this.bindUIEvent();
    this.init();
  }
  update(deltaTime: number) {}

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);

    console.log('SpineAutoPlay', this.node.name);

    const spine = this.node.getComponent(sp.Skeleton);
    if (!spine) {
      console.error('[SpineAutoPlay] spine不存在');
      return;
    }

    if (!this.spineName) {
      this.spineName = getSpineAnimationNames(spine)[0];
    }
    if (!spine.loop) {
      if (this.audioName !== AUDIO_ENUM.NONE) {
        playShotMusic(this.audioName);
      }
      spine.setCompleteListener(() => {
        spine.setCompleteListener(null);
        this.node.destroy();
      });
    }
    spine.setAnimation(0, this.spineName, spine.loop);
  }
}
