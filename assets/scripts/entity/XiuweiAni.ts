import {
  _decorator,
  CCBoolean,
  CCFloat,
  Component,
  instantiate,
  Prefab,
  Vec3,
} from "cc";
import {
  fadeOut,
  getContentSizeWithScale,
  moveAndFadeIn,
} from "../utils/common";
const { ccclass, property } = _decorator;

@ccclass("XiuweiAni")
export class XiuweiAni extends Component {
  @property(Prefab)
  templateNode: Prefab = null; // 预制体模板节点
  @property(CCFloat)
  scaleValue: number = 1;

  @property(CCBoolean)
  autoInit: boolean = true;

  duration = 0.7;
  overlap = 0.8;
  fadeDuration = 0.3;
  hasInit: boolean = false;

  start() {
    if (this.autoInit) {
      this.init();
    }
  }

  init() {
    if (this.hasInit) {
      return;
    }
    this.hasInit = true;
    console.log("修为动画init", this.templateNode?.name);
    // 无限循环调用，每次间隔一定时间
    this.schedule(() => {
      this.spawnAndAnimate();
    }, this.duration * this.overlap);
    this.spawnAndAnimate(); // 初始化时生成一个动画
  }

  stopAni() {
    this.unscheduleAllCallbacks();
    console.log("修为动画stopAni", this.templateNode?.name);
  }

  async spawnAndAnimate() {
    // console.log('修为动画spawnAndAnimate', this.templateNode?.name);
    // 创建新的节点
    const newNode = instantiate(this.templateNode);
    newNode.parent = this.node; // 将新节点添加到父节点中
    newNode.active = true; // 确保节点可见
    newNode.scale = new Vec3(this.scaleValue, this.scaleValue, 1); // 设置节点缩放

    let height = getContentSizeWithScale(this.node).height;
    let offsetY = Math.floor((height / 2) * 0.55);
    // 起始和结束位置
    const startPos = new Vec3(0, 0 - offsetY - 15, 0);
    const endPos = new Vec3(0, 0 + offsetY - 15, 0);

    // 设置初始位置
    newNode.setPosition(startPos);
    newNode.setSiblingIndex(this.node.children.length - 2); //当前试玩独有逻辑

    // 执行动画：从起始位置到结束位置
    await moveAndFadeIn(newNode, startPos, endPos, this.duration, "linear");
    // 动画结束后，节点淡出并销毁
    await fadeOut(newNode, this.fadeDuration);
  }
}
