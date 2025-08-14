import { _decorator, AudioSource, Component, Node } from "cc";
import { hideNodes } from "../utils/common";
const { ccclass, property } = _decorator;

@ccclass("Caption")
export class Caption extends Component {
  @property(Node)
  audioCon: Node = null;

  static instance: Caption = null;

  private captionAudioList: AudioSource[] = [];
  private currCaptionIndex: number = 0;
  private currCaptionAudio: AudioSource = null;

  protected onLoad(): void {
    hideNodes(this.node.children);
    Caption.instance = this;
    this.getAudioList();
  }

  getAudioList() {
    this.audioCon.children.forEach((child) => {
      const audio = child.getComponent(AudioSource);
      if (audio) {
        this.captionAudioList.push(audio);
      }
    });
    console.log("字幕对应的音频生成", this.captionAudioList);
  }

  playNext() {
    return new Promise((resolve, reject) => {
      const currentIdx = this.currCaptionIndex;

      if (currentIdx >= this.captionAudioList.length) {
        this.currCaptionAudio = null;
        console.warn("播放完成");
        resolve({ isComplete: true });
        return;
      }

      this.node.children.forEach((child, idx) => {
        child.active = idx === currentIdx;
        if (child.active) {
          console.log("显示字幕", child.name);
        }
      });

      this.currCaptionAudio = this.captionAudioList[currentIdx];
      this.currCaptionAudio.play();

      this.currCaptionAudio.node.once("ended", () => {
        console.warn("播放结束", this.currCaptionAudio.node.name);
        resolve({});
      });
    });
  }

  hideAllCaption() {
    this.node.children.forEach((child) => {
      child.active = false;
    });
  }

  hideNode() {
    this.node.active = false;
  }
}
