import {
  _decorator,
  Component,
  Node,
  Prefab,
  Vec3,
  instantiate,
  tween,
} from "cc";
const { ccclass, property } = _decorator;
import {
  globalEvent,
  GlobalEvent,
  AUDIO_ENUM,
  GAME_STATUS,
  getGameStatus,
  GAME_FIGURE_KEY,
  gameFigure,
} from "db://assets/scripts/global";
import { playOneShot } from "db://assets/scripts/baseManager/AudioManager";
import { showUI, hideUI } from "db://assets/scripts/baseManager/UIManager";
import { updateFigure } from "db://assets/scripts/baseManager/FigureAnimationManager";

@ccclass("FourArrowGuide")
export class FourArrowGuide extends Component {
  @property(Prefab)
  arrowPrefab: Prefab = null;

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();
  private _arrowNodes: Node[] = []; // 存储四个箭头节点
  private _isGuiding: boolean = false; // 是否正在引导

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
    globalEvent.on(GlobalEvent.JOYSTICK_TOUCH_START, this.stopGuide, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
    this.startGuide(); // 重置时停止引导
  }

  /**
   * 开始四箭头扩散引导
   */
  startGuide() {
    if (!this.arrowPrefab || this._isGuiding) {
      return;
    }

    this.schedule(
      () => {
        playOneShot(AUDIO_ENUM["2.拖动方向提示音"]);
      },
      0.4,
      2
    );

    this._isGuiding = true;
    this.createFourArrows();
    // this.animateArrows();
  }

  /**
   * 停止引导并清理箭头
   */
  stopGuide() {
    this._isGuiding = false;
    this._arrowNodes.forEach((arrow) => {
      if (arrow && arrow.isValid) {
        arrow.destroy();
      }
    });
    this._arrowNodes = [];
  }

  /**
   * 创建四个箭头
   */
  private createFourArrows() {
    const baseDistance = 160; // 基础距离，对应顶部箭头的y=160
    const directions = [
      { x: 0, y: baseDistance, rotation: 0 }, // 上
      { x: 0, y: -baseDistance, rotation: 180 }, // 下
      { x: -baseDistance, y: 0, rotation: 90 }, // 左
      { x: baseDistance, y: 0, rotation: -90 }, // 右
    ];

    directions.forEach((dir, index) => {
      const arrowNode = instantiate(this.arrowPrefab);

      // 设置箭头初始位置（距离中心160单位）
      arrowNode.setPosition(dir.x, dir.y, 0);

      // 设置箭头旋转角度（因为PNG默认向上，需要旋转指向对应方向）
      arrowNode.setRotationFromEuler(0, 0, dir.rotation);

      // 添加到当前节点
      this.node.addChild(arrowNode);
      this._arrowNodes.push(arrowNode);
    });

    // 创建完成后开始动画
    this.animateArrows();
  }

  /**
   * 箭头扩散动画
   */
  private animateArrows() {
    const baseDistance = 160; // 起始距离
    const moveDistance = 50; // 运动距离，从160到210
    const animDuration = 1.0; // 动画持续时间

    const directions = [
      { x: 0, y: baseDistance + moveDistance }, // 上: 160 -> 210
      { x: 0, y: -(baseDistance + moveDistance) }, // 下: -160 -> -210
      { x: -(baseDistance + moveDistance), y: 0 }, // 左: -160 -> -210
      { x: baseDistance + moveDistance, y: 0 }, // 右: 160 -> 210
    ];

    this._arrowNodes.forEach((arrow, index) => {
      const targetPos = new Vec3(directions[index].x, directions[index].y, 0);

      // 扩散动画：从初始位置向外移动50单位
      tween(arrow)
        .to(
          animDuration,
          {
            position: targetPos,
          },
          {
            easing: "quadOut",
          }
        )
        .call(() => {
          // 动画结束后重新开始（循环效果）
          if (this._isGuiding) {
            this.restartArrowAnimation(arrow, index);
          }
        })
        .start();
    });
  }

  /**
   * 重新开始单个箭头的动画（循环效果）
   */
  private restartArrowAnimation(arrow: Node, index: number) {
    if (!arrow || !arrow.isValid || !this._isGuiding) {
      return;
    }

    const baseDistance = 160; // 起始距离
    const moveDistance = 50; // 运动距离
    const animDuration = 1.0;

    // 重置箭头位置到起始位置
    const startPositions = [
      { x: 0, y: baseDistance }, // 上: y=160
      { x: 0, y: -baseDistance }, // 下: y=-160
      { x: -baseDistance, y: 0 }, // 左: x=-160
      { x: baseDistance, y: 0 }, // 右: x=160
    ];

    const targetPositions = [
      { x: 0, y: baseDistance + moveDistance }, // 上: 160 -> 210
      { x: 0, y: -(baseDistance + moveDistance) }, // 下: -160 -> -210
      { x: -(baseDistance + moveDistance), y: 0 }, // 左: -160 -> -210
      { x: baseDistance + moveDistance, y: 0 }, // 右: 160 -> 210
    ];

    // 重置到起始位置
    arrow.setPosition(startPositions[index].x, startPositions[index].y, 0);

    const targetPos = new Vec3(
      targetPositions[index].x,
      targetPositions[index].y,
      0
    );

    // 重新开始扩散动画
    tween(arrow)
      .to(
        animDuration,
        {
          position: targetPos,
        },
        {
          easing: "quadOut",
        }
      )
      .call(() => {
        if (this._isGuiding) {
          this.restartArrowAnimation(arrow, index);
        }
      })
      .start();
  }
}
