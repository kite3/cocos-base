import { _decorator, CCBoolean, CCString, Component, Node, sp } from 'cc';
import { getSpineAnimationNames } from '../utils/common';
const { ccclass, property } = _decorator;

@ccclass('SpineAutoPlay')
export class SpineAutoPlay extends Component {
  @property(Node)
  spineNode: Node = null;
  @property(CCString)
  animName: string = '';
  @property(CCBoolean)
  isLoop: boolean = true;

  spine: sp.Skeleton = null;

  start() {
    if (!this.spineNode) {
      this.spineNode = this.node;
    }
    this.spine = this.spineNode.getComponent(sp.Skeleton);
    if (this.spine) {
      if (!this.animName) {
        this.animName = getSpineAnimationNames(this.spine)[0];
      }
      this.spine.setAnimation(0, this.animName, this.isLoop);
    }
  }
}
