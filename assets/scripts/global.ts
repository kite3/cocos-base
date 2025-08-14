import { EventTarget, Prefab } from "cc";

declare const wx: any;
declare var window: any;

/**
 * 游戏状态
 */
export enum GAME_STATUS {
  WAITING, //等待
  DOING, //进行中
  OVER, //结束
}
let gameStatus: GAME_STATUS = GAME_STATUS.WAITING;
let hasOver: boolean = false;
export const setGameStatus = (status: GAME_STATUS) => {
  gameStatus = status;
};
export const getGameStatus = () => {
  return gameStatus;
};
export const globalEvent = new EventTarget();
/**
 * 全局事件
 */
export enum GlobalEvent {
  NONE = "none", //无事件

  SHAKE_SCREEN = "shakeScreen", //摇晃屏幕
  GAME_PAUSE = "gamePause", //游戏暂停
  GAME_RESUME = "gameResume", //游戏恢复
  GAME_OVER = "gameOver", //游戏结束 待废弃
  GAME_RESET = "gameReset", //游戏重置
  GAME_START = "gameStart", //游戏开始
  GAME_FAIL = "gameFail", //游戏失败
  GAME_WIN = "gameWin", //游戏胜利

  CLICK_EFFECT = "clickEffect", //点击特效

  JOYSTICK_TOUCH_END = "joystickTouchEnd", //摇杆触摸结束
  JOYSTICK_TOUCH_START = "joystickTouchStart", //摇杆触摸开始
  JOYSTICK_MOVE = "joystickTouchMove", //摇杆移动
  DISABLE_JOYSTICK = "disableJoystick", //禁用摇杆

  ENABLE_JOYSTICK = "enableJoystick", //启用摇杆
  WX_NOTIFY = "wxNotify", //微信小游戏唤起

  TILEMAP_MOVE = "tilemapMove", //寻路移动
  TILEMAP_STOP = "tilemapStop", //寻路停止

  CONFIRM_UI = "confirmUI", //确认界面

  AUDIO_LOAD_END = "audioLoadEnd", //音频加载完成
}

globalEvent.on(GlobalEvent.WX_NOTIFY, () => {
  if (hasOver) {
    return;
  }
  hasOver = true;
  try {
    wx?.notifyMiniProgramPlayableStatus?.({
      isEnd: true,
      success: () => {
        console.log("[wx] notifyMiniProgramPlayableStatus成功回调被触发");
      },
      fail: (err) => {
        console.log("[wx] notifyMiniProgramPlayableStatus失败回调被触发:", err);
      },
    });
  } catch (err) {
    console.log("[wx] notifyMiniProgramPlayableStatus失败:", err);
  }
  console.warn("[game] over");
});
globalEvent.on(GlobalEvent.GAME_PAUSE, () => {
  setGameStatus(GAME_STATUS.WAITING);
});
globalEvent.on(GlobalEvent.GAME_RESUME, () => {
  setGameStatus(GAME_STATUS.DOING);
});
globalEvent.on(GlobalEvent.GAME_OVER, () => {
  globalEvent.emit(GlobalEvent.WX_NOTIFY);
  setGameStatus(GAME_STATUS.WAITING);
});
globalEvent.on(GlobalEvent.GAME_START, () => {
  setGameStatus(GAME_STATUS.DOING);
});
globalEvent.on(GlobalEvent.GAME_RESET, () => {
  setGameStatus(GAME_STATUS.DOING);
});
globalEvent.on(GlobalEvent.GAME_WIN, () => {
  setGameStatus(GAME_STATUS.OVER);
});
globalEvent.on(GlobalEvent.GAME_FAIL, () => {
  setGameStatus(GAME_STATUS.OVER);
});
/**
 * 界面层级
 */
export enum UILayer {
  UI = 0,
  POPUP = 1,
  TOOLTIP = 2,
  ALERT = 3,
  LOADING = 4,
}
/**
 * 游戏数值
 */
export enum GAME_FIGURE_KEY {
  DEFAULT,
  金币,
  战力,
  繁荣度,
}
export const gameFigure = Object.keys(GAME_FIGURE_KEY).reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

export const AUDIO_ENUM = {
  NONE: "none",
};

export const globalData = {};

// 设置全局变量，方便web端开发环境调试
if (typeof window !== "undefined" && !window.__37_global__) {
  window.__37_global__ = globalData;
  window.__37_game_status__ = () => {
    return gameStatus;
  };
}
