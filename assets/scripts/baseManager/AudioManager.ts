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
  // 存储多个音频通道
  private audioChannels: Map<string, AudioSource> = new Map<
    string,
    AudioSource
  >();

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
            // 修复受保护属性访问问题
            this._inst.audioClipsMap.set(item.name, item);
          });
          console.log('audioClipsMap', this._inst.audioClipsMap);
          resolve(this._inst);
        });
      });
    }
    return Promise.resolve(this._inst);
  }

  private _audioSource: AudioSource;
  private _audioNode: Node;

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
    this._audioNode = audioMgr;
  }

  public get audioSource() {
    return this._audioSource;
  }

  /**
   * 创建一个新的音频通道
   * @param channelId 通道ID
   * @returns AudioSource实例
   */
  private createChannel(channelId: string): AudioSource {
    // 为每个通道创建一个子节点
    const channelNode = new Node(`audio_channel_${channelId}`);
    this._audioNode.addChild(channelNode);
    const audioSource = channelNode.addComponent(AudioSource);
    this.audioChannels.set(channelId, audioSource);
    return audioSource;
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

    console.log(
      'playOneShot',
      sound,
      ' ',
      audioClip ? 'has audioClip' : 'no audioClip'
    );
    audioClip && this._audioSource.playOneShot(audioClip, volume);
  }

  /**
   * @en
   * play long audio, such as the bg music
   * @zh
   * 播放长音频，比如 背景音乐
   * @param sound clip or url for the sound
   * @param volume
   * @param channelId 音频通道ID，用于区分不同音频
   * @param loop 是否循环播放
   */
  /**
   * 播放音频
   * @param sound 音频剪辑或名称
   * @param volume 音量
   * @param channelId 通道ID
   * @param loop 是否循环播放
   * @param forceNewChannel 是否强制创建新通道，即使通道ID已存在
   * @param onComplete 播放完成回调
   * @returns 使用的通道ID
   */
  play(
    sound: AudioClip | string,
    volume: number = 5,
    channelId: string = 'default',
    loop: boolean = true,
    forceNewChannel: boolean = false,
    onComplete: null | (() => void) = null
  ) {
    const audioClip =
      sound instanceof AudioClip ? sound : this.audioClipsMap.get(sound);
    if (!audioClip) {
      console.warn(`Audio clip not found: ${sound}`);
      return;
    }

    let audioSource: AudioSource;
    let actualChannelId = channelId;

    // 如果强制创建新通道或者是默认通道，生成一个唯一的通道ID
    if (forceNewChannel || channelId === 'default') {
      actualChannelId = `channel_${
        typeof sound === 'string' ? sound : sound.name
      }_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      audioSource = this.createChannel(actualChannelId);
    } else {
      // 如果指定了通道ID且不强制创建新通道，使用或创建对应通道
      if (!this.audioChannels.has(actualChannelId)) {
        audioSource = this.createChannel(actualChannelId);
      } else {
        audioSource = this.audioChannels.get(actualChannelId);
        // 停止当前通道上的音频
        audioSource.stop();
      }
    }

    audioSource.clip = audioClip;
    audioSource.volume = volume;
    audioSource.loop = loop;
    audioSource.play();

    if (onComplete) {
      audioSource.node.once(AudioSource.EventType.ENDED, onComplete);
    }

    console.log('play', sound, 'on channel', actualChannelId);
    return actualChannelId;
  }

  /**
   * stop the audio play
   * @param channelId 要停止的音频通道ID，不传则停止默认通道
   */
  stop(channelId?: string) {
    if (channelId && this.audioChannels.has(channelId)) {
      this.audioChannels.get(channelId).stop();
    } else {
      this._audioSource.stop();
    }
  }

  /**
   * pause the audio play
   * @param channelId 要暂停的音频通道ID，不传则暂停默认通道
   */
  pause(channelId?: string) {
    if (channelId && this.audioChannels.has(channelId)) {
      this.audioChannels.get(channelId).pause();
    } else {
      this._audioSource.pause();
    }
  }

  /**
   * resume the audio play
   * @param channelId 要恢复的音频通道ID，不传则恢复默认通道
   */
  resume(channelId?: string) {
    if (channelId && this.audioChannels.has(channelId)) {
      this.audioChannels.get(channelId).play();
    } else {
      this._audioSource.play();
    }
  }

  /**
   * 设置音量
   * @param volume 音量大小 0-1
   * @param channelId 要设置的音频通道ID，不传则设置默认通道
   */
  setVolume(volume: number, channelId?: string) {
    if (channelId && this.audioChannels.has(channelId)) {
      this.audioChannels.get(channelId).volume = volume;
    } else {
      this._audioSource.volume = volume;
    }
  }

  /**
   * 获取所有活跃的音频通道ID
   */
  getActiveChannels(): string[] {
    return Array.from(this.audioChannels.keys());
  }

  /**
   * 停止所有音频通道的播放
   */
  stopAll() {
    // 停止默认通道
    this._audioSource.stop();

    // 停止所有自定义通道
    this.audioChannels.forEach(audioSource => {
      audioSource.stop();
    });
  }
}

// 存储重复播放的定时器ID
const repeatTimers: Map<string, any[]> = new Map<string, any[]>();

export const playRepeat = (
  sound: string,
  repeatCount: number,
  time: number
) => {
  // 先清除可能存在的定时器
  stopRepeat(sound);

  const timers: any[] = [];
  const batchSize = 10; // 每批创建的定时器数量
  const batchDelay = 16; // 批次间隔时间(ms)

  // 分批创建定时器，避免一次性创建大量定时器导致卡顿
  const createTimerBatch = (startIndex: number) => {
    const endIndex = Math.min(startIndex + batchSize, repeatCount);

    for (let i = startIndex; i < endIndex; i++) {
      const timerId = setTimeout(() => {
        playOneShot(sound);
      }, time * i);
      timers.push(timerId);
    }

    // 如果还有未创建的定时器，安排下一批创建
    if (endIndex < repeatCount) {
      const batchTimerId = setTimeout(() => {
        createTimerBatch(endIndex);
      }, batchDelay);
      timers.push(batchTimerId);
    }
  };

  // 开始创建第一批定时器
  createTimerBatch(0);

  // 存储这个音频的所有定时器ID
  repeatTimers.set(sound, timers);
};

/**
 * 停止重复播放音频
 * @param sound 要停止的音频名称，不传则停止所有重复播放
 */
export const stopRepeat = (sound?: string) => {
  if (sound) {
    // 停止特定音频的重复播放
    const timers = repeatTimers.get(sound);
    if (timers) {
      timers.forEach(clearTimeout);
      repeatTimers.delete(sound);
    }
  } else {
    // 停止所有重复播放
    repeatTimers.forEach(timers => {
      timers.forEach(clearTimeout);
    });
    repeatTimers.clear();
  }
};

export const playOneShot = (sound: string, volume: number = 1.0) => {
  audioManager?.playOneShot?.(sound, volume);
};

export const initAudioManager = (bgMusic: string) => {
  return AudioMgr.getInstance().then(instance => {
    audioManager = instance;
    bgMusic && audioManager.play(bgMusic);
  });
};

/**
 * 停止所有音频播放，包括所有通道
 */
export const stopAllMusic = () => {
  audioManager?.stopAll?.();
  // 同时停止所有重复播放
  stopRepeat();
};

// 导出更多便捷方法
/**
 * 播放音乐，支持多通道同时播放
 * @param sound 音频名称
 * @param volume 音量大小 0-1
 * @param channelId 自定义通道ID，不传则自动生成唯一通道ID
 * @param loop 是否循环播放
 * @param forceNewChannel 是否强制创建新通道，即使指定了通道ID，默认为true
 * @returns 返回使用的通道ID，可用于后续控制该音频
 */
export const playMusic = (
  sound: string,
  volume: number = 1.0,
  channelId?: string,
  loop: boolean = true,
  forceNewChannel: boolean = true
) => {
  // 默认情况下，我们总是创建新的通道来实现多音频并行播放
  return audioManager?.play?.(
    sound,
    volume,
    channelId || 'default',
    loop,
    forceNewChannel
  );
};

// 播放一次性音乐 可监听播放完成
export const playShotMusic = (
  sound: string,
  volume: number = 1.0,
  onComplete: null | (() => void) = null
) => {
  return audioManager?.play?.(
    sound,
    volume,
    'default',
    false,
    true,
    onComplete
  );
};

/**
 * 暂停音乐播放
 * @param channelId 要暂停的音频通道ID，不传则暂停默认通道
 * @param sound 要暂停的音频名称，如果提供，会暂停所有包含该音频名称的通道
 */
export const pauseMusic = (channelId?: string, sound?: string) => {
  if (sound && !channelId) {
    // 如果提供了音频名称但没有通道ID，暂停所有包含该音频名称的通道
    const channels = audioManager?.getActiveChannels?.() || [];
    channels.forEach(id => {
      if (id.includes(`channel_${sound}`)) {
        audioManager?.pause?.(id);
      }
    });
  } else {
    audioManager?.pause?.(channelId);
  }
};

/**
 * 恢复音乐播放
 * @param channelId 要恢复的音频通道ID，不传则恢复默认通道
 * @param sound 要恢复的音频名称，如果提供，会恢复所有包含该音频名称的通道
 */
export const resumeMusic = (channelId?: string, sound?: string) => {
  if (sound && !channelId) {
    // 如果提供了音频名称但没有通道ID，恢复所有包含该音频名称的通道
    const channels = audioManager?.getActiveChannels?.() || [];
    channels.forEach(id => {
      if (id.includes(`channel_${sound}`)) {
        audioManager?.resume?.(id);
      }
    });
  } else {
    audioManager?.resume?.(channelId);
  }
};

/**
 * 停止音乐播放
 * @param channelId 要停止的音频通道ID，不传则停止默认通道
 * @param sound 要停止的音频名称，如果提供，会停止所有包含该音频名称的通道
 */
export const stopMusic = (channelId?: string, sound?: string) => {
  if (sound && !channelId) {
    // 如果提供了音频名称但没有通道ID，停止所有包含该音频名称的通道
    const channels = audioManager?.getActiveChannels?.() || [];
    channels.forEach(id => {
      if (id.includes(`channel_${sound}`)) {
        audioManager?.stop?.(id);
      }
    });
  } else {
    audioManager?.stop?.(channelId);
  }
};

/**
 * 设置音量
 * @param volume 音量大小 0-1
 * @param channelId 要设置的音频通道ID，不传则设置默认通道
 * @param sound 要设置的音频名称，如果提供，会设置所有包含该音频名称的通道
 */
export const setVolume = (
  volume: number,
  channelId?: string,
  sound?: string
) => {
  if (sound && !channelId) {
    // 如果提供了音频名称但没有通道ID，设置所有包含该音频名称的通道
    const channels = audioManager?.getActiveChannels?.() || [];
    channels.forEach(id => {
      if (id.includes(`channel_${sound}`)) {
        audioManager?.setVolume?.(volume, id);
      }
    });
  } else {
    audioManager?.setVolume?.(volume, channelId);
  }
};
