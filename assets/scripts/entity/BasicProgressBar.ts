import {
  _decorator,
  CCFloat,
  Component,
  Node,
  tween,
  UITransform,
  Vec3,
  Sprite,
  Enum,
  CCBoolean
} from 'cc';
const { ccclass, property } = _decorator;
import {
  globalEvent,
  GlobalEvent,
  AUDIO_ENUM
} from 'db://assets/scripts/global';
import { setAnchorPoint } from 'db://assets/scripts/utils/common';

enum ProgressBarType {
  FILLED = 1,
  SCALE_X = 2,
  SCALE_Y = 3
}

@ccclass('BasicProgressBar')
export class BasicProgressBar extends Component {
  @property({
    type: Node,
    displayName: '进度条节点'
  })
  progressBar: Node = null;

  @property({
    type: Enum(ProgressBarType),
    displayName: '进度条类型',
    tooltip: '进度条类型：SCALE=缩放X模式，FILLED=填充模式，SCALE_Y=缩放Y模式'
  })
  progressType: ProgressBarType = ProgressBarType.FILLED;

  @property({
    type: CCFloat,
    displayName: '初始进度（0-1）'
  })
  initRate: number = 0;

  @property({
    type: CCBoolean,
    displayName: '是否启用自动衰减',
    tooltip: '启用后进度条会自动衰减'
  })
  enableAutoDecay: boolean = false;

  @property({
    type: CCFloat,
    displayName: '衰减速度（每帧）',
    tooltip: '每帧减少的进度量，默认0.3%',
    visible: function () {
      return this.enableAutoDecay;
    }
  })
  decaySpeed: number = 0.003;

  @property({
    type: CCFloat,
    displayName: '完成阈值',
    tooltip: '达到此百分比后不再衰减，默认99%',
    visible: function () {
      return this.enableAutoDecay;
    }
  })
  completionThreshold: number = 0.99;

  private _rate: number = 0;

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
  update(deltaTime: number) {
    // 自动衰减逻辑
    if (this.enableAutoDecay && this._rate > 0) {
      // 检查是否达到完成阈值
      if (this._rate < this.completionThreshold) {
        this._rate = Math.max(0, this._rate - this.decaySpeed);
        this.setProgress(this._rate);
      }
    }
  }

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
    this._rate = this.initRate;
    this.setProgress(this._rate);
  }

  get rate(): number {
    return this._rate;
  }

  set rate(value: number) {
    this._rate = value;
    this.setProgress(this._rate);
  }

  setProgress(newRate: number): void {
    if (!this.progressBar) {
      console.error('[BasicProgressBar]进度条节点不存在');
      return;
    }
    this._rate = newRate;
    this.progressBar.active = true;

    if (this.progressType === ProgressBarType.FILLED) {
      const sprite = this.progressBar.getComponent(Sprite);
      if (sprite) {
        sprite.type = Sprite.Type.FILLED;
        sprite.fillType = Sprite.FillType.HORIZONTAL;
        sprite.fillStart = 0;
        sprite.fillRange = newRate;
      } else {
        console.error('[BasicProgressBar]进度条节点缺少Sprite组件');
      }
    } else if (this.progressType === ProgressBarType.SCALE_Y) {
      setAnchorPoint(this.progressBar, 0.5, 1);
      const size = this.progressBar.getComponent(UITransform).contentSize;
      this.progressBar.setPosition(
        this.progressBar.position.x,
        this.progressBar.position.y + size.height / 2,
        0
      );
      this.progressBar.setScale(this.progressBar.scale.x, newRate, 1);
    } else {
      setAnchorPoint(this.progressBar, 0, 0.5);
      const size = this.progressBar.getComponent(UITransform).contentSize;
      this.progressBar.setPosition(
        this.progressBar.position.x - size.width / 2,
        this.progressBar.position.y,
        0
      );
      this.progressBar.setScale(newRate, this.progressBar.scale.y, 1);
    }
  }

  /**
   * 追加进度
   * @param time 进度条播放时长（秒）
   * @param addedRate 进度条增加的进度
   */
  addProgress(addedRate: number, time: number = 0.1): Promise<number> {
    return new Promise(resolve => {
      this._rate = this.customAddFn(this._rate, addedRate);

      if (this._rate > 1) {
        this._rate = 1;
      } else if (this._rate < 0) {
        this._rate = 0;
      }

      if (this.progressType === ProgressBarType.FILLED) {
        const sprite = this.progressBar.getComponent(Sprite);
        if (sprite) {
          tween(sprite)
            .to(
              time,
              { fillRange: this._rate },
              {
                easing: 'linear'
              }
            )
            .call(() => {
              resolve(this._rate);
            })
            .start();
        } else {
          console.error('[BasicProgressBar]进度条节点缺少Sprite组件');
          resolve(this._rate);
        }
      } else if (this.progressType === ProgressBarType.SCALE_Y) {
        tween(this.progressBar)
          .to(
            time,
            { scale: new Vec3(this.progressBar.scale.x, this._rate, 1) },
            {
              easing: 'linear'
            }
          )
          .call(() => {
            resolve(this._rate);
          })
          .start();
      } else {
        tween(this.progressBar)
          .to(
            time,
            { scale: new Vec3(this._rate, this.progressBar.scale.y, 1) },
            {
              easing: 'linear'
            }
          )
          .call(() => {
            resolve(this._rate);
          })
          .start();
      }
    });
  }

  /**
   * 自定义两位数加法，修复浮点数精度问题
   */
  private customAddFn(num1: number, num2: number): number {
    const unit = Math.pow(10, 2);
    return (num1 * unit + num2 * unit) / unit;
  }
}
