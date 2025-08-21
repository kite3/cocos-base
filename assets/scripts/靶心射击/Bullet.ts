import { _decorator, Component, Node, Vec3, view } from 'cc';
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
import { playOneShot } from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';
import { Monster } from './Monster';

@ccclass('Bullet')
export class Bullet extends Component {
  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();

  private targetMonster: Monster = null;
  private outOfScreenOffset: number = 200; // 可视区域偏移
  moveSpeed: number = 1800;
  isHitted: boolean = false;
  isActive: boolean = false;
  private currentDirection: Vec3 = new Vec3(0, 1, 0); // 当前飞行方向

  onLoad() {
    this._initPosition = this.node.position.clone();
    this._initScale = this.node.getScale().clone();
    //通用组件模板，默认提供全局事件绑定、UI事件绑定、初始化方法
    this.bindGlobalEvent();
    this.bindUIEvent();
    this.init();
  }

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
  }

  update(deltaTime: number) {
    if (!this.isActive) return;

    const bulletWorldPos = this.node.getWorldPosition();
    let direction: Vec3;

    // 如果已经碰撞，使用当前方向继续飞行
    if (this.isHitted) {
      direction = this.currentDirection;
    } else {
      // 计算方向
      if (
        this.targetMonster &&
        this.targetMonster.node &&
        this.targetMonster.node.isValid
      ) {
        const monsterWorldPos = this.targetMonster.node.getWorldPosition();
        direction = new Vec3(
          monsterWorldPos.x - bulletWorldPos.x,
          monsterWorldPos.y - bulletWorldPos.y,
          0
        );
        direction.normalize();
        // 记录当前方向
        this.currentDirection = direction.clone();
      } else {
        // 目标无效，子弹垂直向上飞
        direction = new Vec3(0, 1, 0);
        // 记录当前方向
        this.currentDirection = direction.clone();
      }
    }

    // 移动子弹
    const moveDistance = this.moveSpeed * deltaTime;
    const newPosition = new Vec3(
      bulletWorldPos.x + direction.x * moveDistance,
      bulletWorldPos.y + direction.y * moveDistance,
      bulletWorldPos.z
    );
    this.node.setWorldPosition(newPosition);

    // 计算朝向角度（子弹默认朝上，所以需要调整角度计算）
    const angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI - 90;
    this.node.setRotationFromEuler(0, 0, angle);

    // 可视区域外销毁
    const visibleSize = view.getVisibleSize();
    if (bulletWorldPos.y >= visibleSize.height + this.outOfScreenOffset) {
      this.destroyBullet();
    }
  }

  setTarget(targetMonster: Monster) {
    this.targetMonster = targetMonster;
    this.isActive = true;
  }

  /**
   * 处理子弹碰撞
   * 碰撞后子弹继续按当前方向飞行，直到离开可视区域
   */
  onHit() {
    this.isHitted = true;
    // 碰撞后不再追踪目标，继续按当前方向飞行
    this.targetMonster = null;
  }

  destroyBullet() {
    this.scheduleOnce(() => {
      if (this.node?.isValid) {
        this.node.destroy();
      }
    });
  }
}
