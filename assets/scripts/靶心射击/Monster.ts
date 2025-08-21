import {
  _decorator,
  Collider2D,
  Component,
  Contact2DType,
  Node,
  Prefab,
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
  gameFigure,
  globalData
} from 'db://assets/scripts/global';
import { playOneShot } from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';
import { Bullet } from './Bullet';
import { disableCollider } from '../utils/common';

@ccclass('Monster')
export class Monster extends Component {
  @property(Prefab)
  hammerPrefab: Prefab = null;

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

  bindUIEvent() {
    const collider = this.getComponent(Collider2D);
    if (collider) {
      collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
  }

  /**
   * 碰撞开始回调
   */
  private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
    const otherNode = otherCollider.node;
    const bulletComp = otherNode.getComponent(Bullet);
    if (bulletComp && !bulletComp.isHitted) {
      bulletComp.onHit();
      globalData.bulletHitCount += 1;
      disableCollider(otherNode);
      console.log('Monster hit by bullet', Bullet.name);
    }
  }
}
