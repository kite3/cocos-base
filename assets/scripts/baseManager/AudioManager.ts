//AudioMgr.ts
import { Node, AudioSource, AudioClip, resources, director } from 'cc';
let audioManager: AudioMgr = null;

/**
 * @en
 * this is a sington class for audio play, can be easily called from anywhere in you project.
 * @zh
 * 这是一个用于播放音频的单件类，可以很方便地在项目的任何地方调用。
 */
class AudioMgr {
  private static _inst: AudioMgr;
  private audioClipsMap: Map<string, AudioClip> = new Map<string, AudioClip>();
  public static getInstance(dir: string = 'audios'): Promise<AudioMgr> {
    if (this._inst == null) {
      return new Promise<AudioMgr>(resolve => {
        this._inst = new AudioMgr();

        resources.loadDir(dir, AudioClip, (err, res) => {
          if (err) {
            console.error('Failed to load audio resources:', err);
            return;
          }

          res.forEach(item => {
            this._inst.audioClipsMap.set(item._name, item);
          });
          console.log('audioClipsMap', this._inst.audioClipsMap);
          resolve(this._inst);
        });
      });
    }
    return Promise.resolve(this._inst);
  }

  private _audioSource: AudioSource;
  constructor() {
    //@en create a node as audioMgr
    //@zh 创建一个节点作为 audioMgr
    let audioMgr = new Node();
    audioMgr.name = '__audioMgr__';

    //@en add to the scene.
    //@zh 添加节点到场景
    director.getScene().addChild(audioMgr);

    //@en make it as a persistent node, so it won't be destroied when scene change.
    //@zh 标记为常驻节点，这样场景切换的时候就不会被销毁了
    director.addPersistRootNode(audioMgr);

    //@en add AudioSource componrnt to play audios.
    //@zh 添加 AudioSource 组件，用于播放音频。
    this._audioSource = audioMgr.addComponent(AudioSource);
  }

  public get audioSource() {
    return this._audioSource;
  }

  /**
   * @en
   * play short audio, such as strikes,explosions
   * @zh
   * 播放短音频,比如 打击音效，爆炸音效等
   * @param sound clip or url for the audio
   * @param volume
   */
  playOneShot(sound: AudioClip | string, volume: number = 1.0) {
    const audioClip =
      sound instanceof AudioClip ? sound : this.audioClipsMap.get(sound);

    console.log('playOneShot', sound);
    audioClip && this._audioSource.playOneShot(audioClip, volume);
  }

  /**
   * @en
   * play long audio, such as the bg music
   * @zh
   * 播放长音频，比如 背景音乐
   * @param sound clip or url for the sound
   * @param volume
   */
  play(sound: AudioClip | string, volume: number = 1.0) {
    this._audioSource.stop();
    this._audioSource.clip =
      sound instanceof AudioClip ? sound : this.audioClipsMap.get(sound);
    this._audioSource.play();
    this.audioSource.volume = volume;
    this.audioSource.loop = true;
    console.log('play', sound, ' ', this._audioSource.clip);
  }

  /**
   * stop the audio play
   */
  stop() {
    this._audioSource.stop();
  }

  /**
   * pause the audio play
   */
  pause() {
    this._audioSource.pause();
  }

  /**
   * resume the audio play
   */
  resume() {
    this._audioSource.play();
  }
}
export const play = (sound: string) => {
  audioManager?.play?.(sound);
};
export const playOneShot = (sound: string) => {
  audioManager?.playOneShot?.(sound);
};
export const initAudioManager = (bgMusic: string) => {
  return AudioMgr.getInstance().then(instance => {
    audioManager = instance;
    audioManager.play(bgMusic);
  });
};
