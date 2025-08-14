import { _decorator, Component, Node, Label, Enum } from 'cc';
const { ccclass, property } = _decorator;
import {
  gameFigure,
  GAME_FIGURE_KEY,
  globalEvent,
  GlobalEvent
} from '../global';

@ccclass('GameFigure')
export class GameFigure extends Component {
  private _labelState: Label;
  private _initValue: number = 0;

  @property({
    type: String,
    displayName: '前缀',
    tooltip: '前缀'
  })
  private prefix: string = '';

  @property({
    type: String,
    displayName: '后缀',
    tooltip: '后缀'
  })
  private suffix: string = '';

  @property({
    type: Enum(GAME_FIGURE_KEY),
    displayName: '数值类型',
    tooltip: '数值类型'
  })
  private stateKey: GAME_FIGURE_KEY = GAME_FIGURE_KEY.DEFAULT;

  onLoad() {
    this._labelState = this.node.getComponent(Label);
    this._initValue = gameFigure[this.stateKey];
    globalEvent.on(GlobalEvent.GAME_RESET, this.init, this);
  }

  init() {
    gameFigure[this.stateKey] = this._initValue;
  }

  update(deltaTime: number) {
    this._labelState.string =
      this.prefix + gameFigure[this.stateKey] + this.suffix;
  }
}
