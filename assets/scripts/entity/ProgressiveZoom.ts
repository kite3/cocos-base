import { _decorator, CCFloat, Component, Node } from "cc";
import { progressiveZoom } from "../utils/common";
const { ccclass, property } = _decorator;

@ccclass("ProgressiveZoom")
export class ProgressiveZoom extends Component {
  @property({
    type: [Node],
    tooltip: "需要递进出现的节点按顺序填入",
  })
  nodeList: Node[] = [];

  @property({
    type: CCFloat,
    tooltip: "间隔时间",
  })
  intervalDelay: number = 0.2;

  @property({
    type: CCFloat,
    tooltip: "动画时间",
  })
  animationDuration: number = 0.3;

  start() {
    progressiveZoom(this.nodeList, this.intervalDelay, this.animationDuration);
  }
}
