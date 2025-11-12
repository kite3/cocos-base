import {
  _decorator,
  Component,
  Node,
  Vec2,
  Vec3,
  UITransform,
  Size,
  tween,
  Enum,
  CCInteger,
  EventTouch,
  CCFloat
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

@ccclass('MaskFocus')
export class MaskFocus extends Component {
  @property(Size)
  private fromSize: Size = new Size();

  @property(CCFloat)
  private duration: number = 0.35;

  @property([Node])
  configNodes: Node[] = [];

  @property({
    type: Enum(GlobalEvent)
  })
  private event: GlobalEvent = GlobalEvent.NONE;

  @property({
    type: Enum(AUDIO_ENUM)
  })
  private focusSound: string = AUDIO_ENUM.NONE;

  private _initSize: Size = new Size();
  private _currentIndex: number = -1;
  private _isActive: boolean = false;
  static _instance: MaskFocus = null;

  onLoad() {
    this._initSize = this.node.getComponent(UITransform).contentSize.clone();
    this.node.getComponent(UITransform).contentSize = this.fromSize;
    this.node.children[0].getComponent(UITransform).contentSize = this.fromSize;
    this.node.active = false;
    MaskFocus._instance = this;
  }

  static getInstance(): MaskFocus {
    return MaskFocus._instance;
  }

  showFocusByIndex(
    index: number,
    width?: number,
    height?: number
  ): Promise<void> {
    if (index < 0 || index >= this.configNodes.length) return Promise.resolve();
    const targetNode = this.configNodes[index];
    this._currentIndex = index;
    return this._showFocusInternal(targetNode, width, height);
  }

  showFocusByNode(
    targetNode: Node,
    width?: number,
    height?: number
  ): Promise<void> {
    if (!targetNode) return Promise.resolve();
    this._currentIndex = -1;
    return this._showFocusInternal(targetNode, width, height);
  }

  private _showFocusInternal(
    targetNode: Node,
    width?: number,
    height?: number
  ): Promise<void> {
    return new Promise(resolve => {
      if (this.focusSound) {
        playOneShot(this.focusSound);
      }

      this._isActive = true;
      this.node.active = true;

      const localPos = this.node.parent
        .getComponent(UITransform)
        .convertToNodeSpaceAR(targetNode.worldPosition);

      this.node.setPosition(localPos);
      this.node.getComponent(UITransform).contentSize = this.fromSize;

      const targetSize =
        width && height ? new Size(width, height) : this._initSize;

      tween(this.node.getComponent(UITransform))
        .to(this.duration, {
          contentSize: targetSize
        })
        .call(() => {
          globalEvent.emit(this.event);
          resolve();
        })
        .start();

      targetNode.on(Node.EventType.TOUCH_END, this.onTargetClick, this, true);
    });
  }

  private onTargetClick(event: EventTouch) {
    if (!this._isActive) return;

    this.hideFocus();
  }

  hideFocus() {
    this._isActive = false;
    this.node.active = false;

    if (
      this._currentIndex >= 0 &&
      this._currentIndex < this.configNodes.length
    ) {
      this.configNodes[this._currentIndex].off(
        Node.EventType.TOUCH_END,
        this.onTargetClick,
        this,
        true
      );
    }
  }

  update(deltaTime: number) {}
}
