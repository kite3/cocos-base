import {
  _decorator,
  Component,
  Node,
  Label,
  Button,
  Vec3,
  Prefab,
  Animation,
  sp,
  tween,
  UITransform,
  EventTouch
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
  playShotMusic,
  playMusic,
  pauseMusic
} from 'db://assets/scripts/baseManager/AudioManager';
import { showUI, hideUI } from 'db://assets/scripts/baseManager/UIManager';
import { updateFigure } from 'db://assets/scripts/baseManager/FigureAnimationManager';
import { disableBtn, enableBtn, hideNodes, sleep } from '../utils/common';

@ccclass('DialogItemSelected')
export class DialogItemSelected extends Component {
  @property({
    type: Node,
    displayName: '列表容器'
  })
  listContainer: Node = null;

  @property(Button)
  btn: Button = null;

  private _initPosition: Vec3 = new Vec3();
  private _initScale: Vec3 = new Vec3();
  private _cardOriginalScales: Map<Node, Vec3> = new Map();
  private _selectedScale: number = 1.1;
  private _unselectedScale: number = 0.9;
  private _animationDuration: number = 0.3;
  private _isAnimating: boolean = false;
  private _selectedIndex: number = -1;

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
    globalEvent.on(GlobalEvent.DIALOG_ITEM_CLICKED, this.handleItemClick, this);
  }

  bindUIEvent() {}

  init() {
    this.node.setPosition(this._initPosition);
    this.node.setScale(this._initScale);
    this.saveOriginalScales();
    this.hideSelectedNodes();
    disableBtn(this.btn);
  }

  saveOriginalScales() {
    if (this.listContainer) {
      this.listContainer.children.forEach(child => {
        const originalScale = child.getScale().clone();
        this._cardOriginalScales.set(child, originalScale);
      });
    }
  }

  hideSelectedNodes() {
    this.listContainer.children.forEach((child, idx) => {
      child.children[0].active = false;
    });
  }

  handleItemClick(event: EventTouch, customData: any) {
    if (this._isAnimating) {
      return;
    }
    enableBtn(this.btn);
    console.log('customData', customData);
    this._isAnimating = true;
    this.hideSelectedNodes();

    this.listContainer.children.forEach((child, idx) => {
      const originalScale =
        this._cardOriginalScales.get(child) || new Vec3(1, 1, 1);

      if (child === event.target) {
        this._selectedIndex = idx;
        child.children[0].active = true;
        const targetScale = new Vec3(
          originalScale.x * this._selectedScale,
          originalScale.y * this._selectedScale,
          originalScale.z
        );
        tween(child)
          .stop()
          .to(
            this._animationDuration,
            { scale: targetScale },
            { easing: 'backOut' }
          )
          .call(() => {
            this._isAnimating = false;
          })
          .start();
      } else {
        const targetScale = new Vec3(
          originalScale.x * this._unselectedScale,
          originalScale.y * this._unselectedScale,
          originalScale.z
        );
        tween(child)
          .stop()
          .to(
            this._animationDuration,
            { scale: targetScale },
            { easing: 'backOut' }
          )
          .start();
      }
    });
  }

  async handleBtnClick() {
    globalEvent.emit(GlobalEvent.CLICK_EFFECT);
    await sleep(0.1);
    globalEvent.emit(GlobalEvent.DIALOG_BTN_CLICKED, this._selectedIndex);
  }
}
