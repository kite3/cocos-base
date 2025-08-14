import {
  _decorator,
  Component,
  Node,
  Vec3,
  find,
  Enum,
  EventHandler,
  Button
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

@ccclass('BtnPlus')
export class BtnPlus extends Component {
  @property({
    type: Node,
    displayName: '目标节点',
    tooltip: '目标节点，默认监听Canvas'
  })
  private targetNode: Node = null;

  @property({
    type: [Enum(GlobalEvent)],
    displayName: '事件',
    tooltip: '事件'
  })
  private events: GlobalEvent[] = [];
  @property({
    type: [Node],
    displayName: '显示节点',
    tooltip: '显示节点'
  })
  private showNodes: Node[] = [];
  @property({
    type: [Node],
    displayName: '隐藏节点',
    tooltip: '隐藏节点'
  })
  private hideNodes: Node[] = [];

  onLoad() {
    this.targetNode = this.targetNode || find('Canvas');

    this.events.forEach(event => {
      const handler = new EventHandler();
      handler.target = this.targetNode;
      handler.component = 'Game';

      if (event == GlobalEvent.WX_NOTIFY) {
        handler.handler = 'notifyWx';
      } else {
        handler.handler = 'triggerEvent';
        handler.customEventData = event;
      }

      this.node.getComponent(Button).clickEvents.push(handler);
    });

    this.showNodes.forEach(node => {
      const handler = new EventHandler();
      handler.target = this.targetNode;
      handler.component = 'Game';
      handler.handler = 'showUI';
      handler.customEventData = node.name;

      this.node.getComponent(Button).clickEvents.push(handler);
    });

    this.hideNodes.forEach(node => {
      const handler = new EventHandler();
      handler.target = this.targetNode;
      handler.component = 'Game';
      handler.handler = 'hideUI';
      handler.customEventData = node.name;

      this.node.getComponent(Button).clickEvents.push(handler);
    });
  }
}
