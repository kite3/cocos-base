import {
  _decorator,
  Component,
  Node,
  Label,
  Vec3,
  CCFloat,
  Enum,
  Color,
  CCString
} from 'cc';
const { ccclass, property } = _decorator;
import {
  playOneShot,
  playMusic,
  pauseMusic
} from 'db://assets/core/scripts/baseManager/AudioManager';
import { globalEvent, GlobalEvent, AUDIO_ENUM } from './global';
import { isNodeVisible } from '../core/scripts/utils/common';
import { HTML5, WECHAT } from 'cc/env';

if (HTML5) {
  console.warn('网页端');
}
if (WECHAT) {
  console.warn('微信端');
}

interface LabelData {
  label: Label;
  originalText: string;
  originalColor: Color;
}

interface TypeTask {
  startIndex: number;
  endIndex: number;
  currentLabelIndex: number;
  currentCharIndex: number;
  taskId: string;
  callback: () => void;
  resolve: () => void;
}

@ccclass('MultiColorTyper')
export class MultiColorTyper extends Component {
  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();

  @property({
    type: CCFloat,
    displayName: '打字间隔时间'
  })
  private textInterval: number = 0.05;

  @property({
    type: Enum(AUDIO_ENUM),
    displayName: '打字音频'
  })
  private textAppearAudio: AUDIO_ENUM = AUDIO_ENUM.NONE;

  public instanceId: string = '';

  private _labelList: LabelData[] = [];
  private _typeTasks: Map<string, TypeTask> = new Map();
  private _taskIdCounter: number = 0;

  static instances: Map<string, MultiColorTyper> = new Map();

  onLoad() {
    this._initPosition = this.node.position.clone();
    this._initScale = this.node.getScale().clone();
    this.collectLabels();
    this.bindGlobalEvent();
    this.bindUIEvent();
    this.init();

    if (!this.instanceId) {
      this.instanceId = this.node.name;
    }

    // 检查是否重名
    if (MultiColorTyper.instances.has(this.instanceId)) {
      console.error(
        `[MultiColorTyper] 实例ID "${this.instanceId}" 已存在，节点: ${this.node.name}`
      );
      return;
    }

    // 注册实例
    MultiColorTyper.instances.set(this.instanceId, this);
  }

  onDestroy() {
    // 注销实例
    if (this.instanceId) {
      MultiColorTyper.instances.delete(this.instanceId);
    }
  }

  /**
   * 通过实例ID获取打字机实例
   * @param instanceId 打字机的实例ID
   * @returns 打字机实例，如果不存在则返回null
   */
  static getInstance(instanceId: string): MultiColorTyper | null {
    if (!instanceId) {
      console.error(`[MultiColorTyper] 实例ID为空`);
      return null;
    }
    if (!MultiColorTyper.instances.has(instanceId)) {
      console.error(`[MultiColorTyper] 实例ID "${instanceId}" 不存在`);
      return null;
    }
    return MultiColorTyper.instances.get(instanceId) || null;
  }

  update(deltaTime: number) {}

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  bindUIEvent() {}

  collectLabels() {
    this._labelList = [];
    this.collectLabelsRecursive(this.node);
    console.log(
      '打印机收集',
      this._labelList.map(v => v.originalText)
    );
  }

  private collectLabelsRecursive(node: Node) {
    const label = node.getComponent(Label);
    if (label && label.node.active) {
      label.overflow = Label.Overflow.NONE; //避免label内容清空后，打字时不停的抖
      label.enableWrapText = false; //不换行
      if (HTML5) {
        label.isBold = false; //网页端加粗展示很奇怪，空间会不足。
      } else {
        label.isBold = true;
      }
      this._labelList.push({
        label: label,
        originalText: label.string,
        originalColor: label.color.clone()
      });
    }
    for (let i = 0; i < node.children.length; i++) {
      this.collectLabelsRecursive(node.children[i]);
    }
  }

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
    this._typeTasks.clear();
    this._taskIdCounter = 0;
    // 停止所有定时器
    this.unscheduleAllCallbacks();
    for (let i = 0; i < this._labelList.length; i++) {
      this._labelList[i].label.string = '';
    }
  }

  /**
   * 刷新Label文本
   */
  refreshLabelText(dynamicLabelList: Label[]) {
    // 移除隐藏的label
    this._labelList = this._labelList.filter(v => isNodeVisible(v.label.node));
    console.log('移除隐藏的label', this._labelList);
    // 更新指定label文本
    dynamicLabelList.forEach(label => {
      const labelData = this._labelList.find(v => v.label === label);
      if (labelData) {
        labelData.originalText = label.string;
        labelData.label.string = '';
      }
    });
  }

  getLabelLength(): number {
    return this._labelList.length;
  }

  /**
   * 开始打字机效果
   * @param startIndex 起始Label下标（从0开始）
   * @param endIndex 终止Label下标（包含）
   * @returns Promise，在打字效果完成时resolve
   */
  typeText(
    startIndex: number,
    endIndex: number = this._labelList.length - 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        startIndex < 0 ||
        endIndex < 0 ||
        endIndex >= this._labelList.length ||
        startIndex > endIndex
      ) {
        reject(new Error('Invalid index range'));
        return;
      }

      // 创建新的打字任务
      const taskId = `task_${this._taskIdCounter++}`;
      const typeWriterFunc = () => {
        this.typeWriterFuncForTask(taskId);
      };

      const task: TypeTask = {
        startIndex,
        endIndex,
        currentLabelIndex: startIndex,
        currentCharIndex: 0,
        taskId,
        callback: typeWriterFunc,
        resolve: resolve
      };
      this._typeTasks.set(taskId, task);

      // 立即执行一次
      typeWriterFunc();
      // 开始定时器
      this.schedule(typeWriterFunc, this.textInterval);
    });
  }

  private typeWriterFuncForTask(taskId: string) {
    const task = this._typeTasks.get(taskId);
    if (!task) {
      return;
    }

    if (task.currentLabelIndex > task.endIndex) {
      // 任务完成，移除任务并停止定时器
      this.unschedule(task.callback);
      this._typeTasks.delete(taskId);

      // 调用resolve通知完成
      task.resolve();
      return;
    }

    const labelData = this._labelList[task.currentLabelIndex];
    const fullText = labelData.originalText;

    // 检测开头空白字符数量
    const leadingSpacesMatch = fullText.match(/^\s*/);
    const leadingSpacesCount = leadingSpacesMatch
      ? leadingSpacesMatch[0].length
      : 0;

    if (task.currentCharIndex < fullText.length) {
      // 如果当前还在开头空白区域，直接跳过到第一个非空白字符
      if (task.currentCharIndex < leadingSpacesCount) {
        task.currentCharIndex = leadingSpacesCount;
        // 显示开头空白（保留站位）
        labelData.label.string = fullText.substring(0, leadingSpacesCount);
        labelData.label.color = labelData.originalColor;
      } else {
        labelData.label.string = fullText.substring(
          0,
          task.currentCharIndex + 1
        );
        labelData.label.color = labelData.originalColor;
        task.currentCharIndex++;
      }
    } else {
      task.currentLabelIndex++;
      task.currentCharIndex = 0;
    }
  }

  /**
   * 开始播放打字音频（外部手动调用）
   */
  public startTypingAudio() {
    // 如果已经配置了音频且不是NONE，则开始循环播放
    if (this.textAppearAudio && this.textAppearAudio !== AUDIO_ENUM.NONE) {
      playMusic(this.textAppearAudio, 1.0, undefined, true, true);
    }
  }

  /**
   * 停止打字音频（外部手动调用）
   */
  public stopTypingAudio() {
    // 通过音频名称暂停所有相关通道
    if (this.textAppearAudio && this.textAppearAudio !== AUDIO_ENUM.NONE) {
      pauseMusic(undefined, this.textAppearAudio);
    }
  }
}
