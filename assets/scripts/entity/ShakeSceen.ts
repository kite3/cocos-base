import {
  _decorator,
  Component,
  Node,
  Vec3,
  tween,
  CCInteger,
  CCFloat,
  Widget
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
import { playOneShot } from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';

@ccclass('ShakeSceen')
export class ShakeSceen extends Component {
  @property([Node])
  private shakeNodes: Node[] = [];
  @property(CCInteger)
  private shakeIntensity: number = 10; // 摇晃强度 - 增大幅度
  @property(CCFloat)
  private shakeDuration: number = 0.4; // 摇晃持续时间（秒）

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();

  private nodeInitPositions: Map<Node, Vec3> = new Map();
  private isShaking: boolean = false; // 防止重复摇晃
  start() {
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
    globalEvent.on(GlobalEvent.SHAKE_SCREEN, this.shakeScreen, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
    this.isShaking = false;

    if (this.nodeInitPositions.size === 0) {
      // 缓存每个摇晃节点的原始位置
      this.shakeNodes.forEach(node => {
        if (node) {
          this.nodeInitPositions.set(node, node.position.clone());
        }
        // 禁用Widget组件防止干扰摇晃
        const widget = node.getComponent(Widget);
        if (widget) {
          widget.enabled = false;
        }
      });
      console.log('shakeScreen init', this.nodeInitPositions.values());
    } else {
      this.nodeInitPositions.forEach((pos, node) => {
        node.setPosition(pos);
      });
      console.log('shakeScreen recover', this.nodeInitPositions.values());
    }
  }

  shakeScreen() {
    if (this.isShaking) return; // 防止重复摇晃
    if (this.shakeNodes.length === 0) return; // 没有要摇晃的节点

    this.isShaking = true;

    // 使用更短的时间间隔，增加摇晃次数
    const shakeSteps = 12; // 增加摇晃步骤数量
    const stepDuration = this.shakeDuration / shakeSteps;

    // 生成统一的随机摇晃偏移序列（所有节点使用相同的偏移）
    const generateRandomOffset = (intensity: number) => {
      const angle = Math.random() * Math.PI * 2; // 随机角度 0-2π
      const magnitude = intensity * (0.5 + Math.random() * 0.5); // 随机强度 50%-100%
      return {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude
      };
    };

    // 预生成所有摇晃步骤的偏移值
    const shakeOffsets: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < shakeSteps - 1; i++) {
      const intensity = this.shakeIntensity * (1 - i / shakeSteps); // 强度递减
      shakeOffsets.push(generateRandomOffset(intensity));
    }

    // 为每个节点创建摇晃动画
    const shakePromises: Promise<void>[] = [];

    this.shakeNodes.forEach(node => {
      if (!node || !this.nodeInitPositions.has(node)) return;

      const originalPos = this.nodeInitPositions.get(node)!.clone();
      // console.log(`节点 ${node.name} 原始位置:`, originalPos);

      // 创建每个节点的摇晃序列（使用相同的偏移序列）
      const promise = new Promise<void>(resolve => {
        let tweenChain = tween(node);

        // 应用预生成的摇晃偏移
        shakeOffsets.forEach(offset => {
          tweenChain = tweenChain.to(stepDuration, {
            position: new Vec3(
              originalPos.x + offset.x,
              originalPos.y + offset.y,
              originalPos.z
            )
          });
        });

        // 最后回到原位
        tweenChain
          .to(stepDuration, { position: originalPos })
          .call(() => {
            // console.log(`节点 ${node.name} 摇晃结束，回到原位:`, node.position);
            resolve();
          })
          .start();
      });

      shakePromises.push(promise);
    });

    Promise.all(shakePromises).then(() => {
      this.isShaking = false;
      // console.log('所有节点摇晃完成');
    });
  }
}
