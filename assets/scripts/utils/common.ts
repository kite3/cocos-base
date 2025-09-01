import {
  UITransform,
  Size,
  view,
  Prefab,
  instantiate,
  Vec3,
  TweenEasing,
  UIOpacity,
  tween,
  Node,
  Animation,
  find,
  Widget,
  sp,
  sys,
  Component,
  Layout,
  Vec2,
  Collider2D
} from 'cc';

declare const wx: any;

export function sleep(seconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}

export function handleGameOver() {
  try {
    wx?.notifyMiniProgramPlayableStatus?.({
      isEnd: true,
      success: () => {
        console.log('[wx] notifyMiniProgramPlayableStatus成功回调被触发');
      },
      fail: err => {
        console.log('[wx] notifyMiniProgramPlayableStatus失败回调被触发:', err);
      }
    });
  } catch (err) {
    console.log('[wx] notifyMiniProgramPlayableStatus失败:', err);
  }
  console.warn('[game] over');
}

export function isWeb() {
  return typeof window !== 'undefined' && !window['wx'];
}

export function isWebDevelopment() {
  const isCocosEditor = location.href.indexOf('packages://scene/static') > -1;
  console.log('isCocosEditor', isCocosEditor);
  return isWeb() && (location.href.indexOf('localhost') > -1 || isCocosEditor);
}

export function isDebugMode() {
  return isWeb() && location.href.indexOf('debug=1') > -1;
}

export const getContentSizeWithScale = (node: Node) => {
  let size = node.getComponent(UITransform).contentSize;
  return new Size(size.width * node.scale.x, size.height * node.scale.y);
};

export const getRandomInRange = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  // 生成闭区间 [min, max] 内的随机整数
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 显示手指引导
 * @param prefab 手指预制体
 * @param targetNode 目标节点
 * @returns 清理函数
 */
export function commonShowFinger(
  prefab: Prefab,
  targetNode: Node,
  offset: { x: number; y: number } = { x: 0, y: 0 },
  parentNode: Node = find('Canvas')
) {
  const parent = parentNode;
  const fingerNode = instantiate(prefab);

  const targetWorldPos = targetNode.getWorldPosition();
  const localPos = parent
    .getComponent(UITransform)
    .convertToNodeSpaceAR(targetWorldPos);

  // 计算目标节点的边界
  const size = getContentSizeWithScale(fingerNode);
  const fingerWidth = size.width;
  const fingerHeight = size.height;

  // 计算最终位置（包含偏移）
  const centerX = localPos.x;
  const centerY = localPos.y;

  // 右下角起始位置
  const rightBottomX = centerX + fingerWidth / 2 + offset.x;
  const rightBottomY = centerY - fingerHeight / 1.5 + offset.y;

  // 小幅度左上移动的目标位置
  const moveDistance = 30; // 移动距离，可以根据需要调整
  const leftTopX = rightBottomX - moveDistance;
  const leftTopY = rightBottomY + moveDistance;

  // 设置手指初始位置（右下角）
  fingerNode.setPosition(rightBottomX, rightBottomY, 0);
  parent.addChild(fingerNode);

  // 创建手指小幅度往左上角移动的动画
  tween(fingerNode)
    .to(
      0.4,
      { position: new Vec3(leftTopX, leftTopY, 0) },
      {
        easing: 'sineInOut'
      }
    )
    .to(
      0.4,
      { position: new Vec3(rightBottomX, rightBottomY, 0) },
      {
        easing: 'sineInOut'
      }
    )
    .union()
    .repeatForever()
    .start();

  return () => {
    if (fingerNode && fingerNode.isValid) {
      fingerNode.destroy();
    }
  };
}

export function setContentSize(node: Node, size: Size) {
  node
    .getComponent(UITransform)
    .setContentSize(new Size(size.width, size.height));
}

export function getUIOpacity(node: Node): UIOpacity {
  let opacity = node.getComponent(UIOpacity);
  if (!opacity) {
    opacity = node.addComponent(UIOpacity);
  }
  return opacity;
}

export function hideNodes(nodes: Node[]) {
  nodes.forEach(node => {
    if (node) {
      node.active = false;
    }
  });
}

/**
 * 获取spine动画名称
 * @param skeleton
 * @returns
 */
export function getSpineAnimationNames(skeleton: sp.Skeleton): string[] {
  const enumMap = skeleton.skeletonData.getAnimsEnum?.();
  return enumMap
    ? Object.keys(enumMap).filter(v => v.indexOf('None') === -1)
    : [];
}

/**
 * 追加特效到指定节点,例如点击后显示特效
 */
export function addEffectWithTargetNode({
  prefab,
  targetNode,
  offset = { x: 0, y: 0 },
  aniOpts = { loopNum: 1, scaleDirection: 1 },
  onComplete
}: {
  prefab: Prefab;
  targetNode: Node;
  offset?: { x: number; y: number };
  aniOpts?: { loopNum: number; scaleDirection?: number };
  onComplete?: () => void;
}) {
  const node = instantiate(prefab);

  // 追加到canvas节点比较稳妥,添加到其他节点可能会受到layout等组件影响
  const localPos = find('Canvas/main/特效容器')
    .getComponent(UITransform)
    .convertToNodeSpaceAR(targetNode.worldPosition);
  find('Canvas/main/特效容器').addChild(node);

  node.setPosition(localPos.x + offset.x, localPos.y + offset.y, localPos.z);
  node.setScale(
    node.scale.x * aniOpts.scaleDirection,
    node.scale.y,
    node.scale.z
  );

  let animation: Animation = null;
  // 检查是否有spine组件
  const spine = sp && node.getComponent(sp.Skeleton);
  const isLoop = aniOpts.loopNum === -1;
  if (spine) {
    const defaultAnimation = getSpineAnimationNames(spine)[0];
    if (!defaultAnimation) {
      console.error('没有找到spine动画');
      return;
    }
    if (!isLoop) {
      spine.setCompleteListener(() => {
        node.destroy();
      });
    }
    spine.setAnimation(0, defaultAnimation, isLoop);
  } else {
    animation = node.getComponent(Animation);
    if (isLoop) {
      animation.on(Animation.EventType.FINISHED, () => {
        onComplete?.();
        animation.play();
      });
      animation.play();
    } else {
      let playCount = 0;
      const onFinished = () => {
        playCount++;
        if (playCount >= aniOpts.loopNum) {
          node.destroy();
        } else {
          animation.play();
        }
      };
      animation.on(Animation.EventType.FINISHED, onFinished);
      animation.play();
    }
  }

  return {
    animation,
    destoryAnimFn: () => {
      node.destroy();
    }
  };
}

/**
 * 添加特效到指定位置
 */
export function addEffectWithWorldPosition({
  prefab,
  worldPosition
}: {
  prefab: Prefab;
  worldPosition: Vec3;
  done?: (node: Node, animation: Animation) => void;
}) {
  const node = instantiate(prefab);

  // 追加到canvas节点比较稳妥,添加到其他节点可能会受到layout等组件英雄
  node.parent = find('Canvas');
  const localPos = find('Canvas')
    .getComponent(UITransform)
    .convertToNodeSpaceAR(worldPosition);

  node.setPosition(localPos.x, localPos.y, localPos.z);

  const animation = node.getComponent(Animation);
  animation.once(Animation.EventType.FINISHED, () => {
    node.destroy();
  });
  animation.play();
}

/**
 * 获取刘海高度,不是特别准确,仅供参考
 * @returns
 */
export function getLiuhaiHeight() {
  const visibleSize = view.getVisibleSize();
  console.log('visibleSize', visibleSize);

  const safeArea = sys.getSafeAreaRect();
  console.log('safeArea', safeArea);

  const liuhaiHeight = visibleSize.height - safeArea.height - safeArea.y;
  console.log('刘海高度', liuhaiHeight);

  const h = liuhaiHeight / (720 / 375);
  console.log('缩放比换算后的刘海高度', h);

  let ph = h > 30 ? h + 20 : 0;
  console.log('修正后的刘海高度1', ph);

  ph = ph > 80 ? 80 : ph;
  console.log('修正后的刘海高度2', ph);

  return ph;
}

/**
 * 更新节点widget组件的top位置,一般用于适配刘海屏
 * @param node
 */
export function updateWidgetWithLiuhai(node: Node, offsetY: number = 0) {
  if (!node) return;
  const statusBarHeight = getLiuhaiHeight();
  const widget = node.getComponent(Widget);
  if (widget) {
    widget.top = widget.top + statusBarHeight + offsetY;
    widget.updateAlignment();
  }
}

/**
 * 缩放节点并保持底部对齐（适用于中心缩放的节点）
 * @param node 要缩放的节点
 * @param scale 缩放倍数（可传单个数值或 Vec3）
 */
export function scaleWithBottomAlign(node: Node, scale: number | Vec3) {
  const uiTransform = node.getComponent(UITransform);

  const originalHeight = uiTransform.height;
  const anchorY = node.getComponent(UITransform)?.anchorY ?? 0.5;

  const oldScale = node.scale;
  const newScale =
    typeof scale === 'number' ? new Vec3(scale, scale, scale) : scale;

  const deltaScaleY = newScale.y - oldScale.y;
  // 计算缩放前后的偏移量
  const offsetY = originalHeight * deltaScaleY * anchorY;

  // 更新 scale 和位置
  node.setScale(newScale);
  node.setPosition(node.position.x, node.position.y + offsetY, node.position.z);
}

export function fadeIn(node: Node, duration = 0.5) {
  node.active = true;
  const uiOpacity = getUIOpacity(node);
  uiOpacity.opacity = 0;
  tween(uiOpacity)
    .to(
      duration,
      {
        opacity: 255
      },
      {
        easing: 'quadOut'
      }
    )
    .start();
}

export function scaleIn(
  node: Node,
  duration: number = 0.4,
  easing: TweenEasing = 'quadOut'
) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const originScale = node.scale.clone();
    node.setScale(0, 0, 1);
    tween(node)
      .to(duration, { scale: originScale }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

export function scaleInBounce(
  node: Node,
  duration: number = 0.4,
  overshoot: number = 1.2
) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const originScale = node.scale.clone();
    const overshootScale = new Vec3(
      originScale.x * overshoot,
      originScale.y * overshoot,
      originScale.z
    );

    node.setScale(0, 0, 0);

    tween(node)
      .to(duration * 0.6, { scale: overshootScale }, { easing: 'quadOut' })
      .to(duration * 0.4, { scale: originScale }, { easing: 'backOut' })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

export const moveIn = (
  node: Node,
  startPos: Vec3,
  endPos: Vec3,
  duration = 0.3,
  easing: TweenEasing = 'sineInOut'
) => {
  return new Promise(resolve => {
    node.active = true;
    node.setPosition(startPos);

    tween(node)
      .to(duration, { position: endPos }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
};

/**
 * 淡出节点
 * @param node
 * @param duration
 */
export function fadeOut(node: Node, duration = 0.4) {
  let uiOpacity = getUIOpacity(node);
  if (!uiOpacity) {
    uiOpacity = node.addComponent(UIOpacity);
  }
  tween(uiOpacity)
    .to(
      duration,
      {
        opacity: 0
      },
      {
        easing: 'quadOut'
      }
    )
    .call(() => {
      node.destroy();
    })
    .start();
}

export function findHeroCon() {
  return find('Canvas/main/player');
}

export function getPrevNode(node: Node) {
  const currentIndex = node.parent.children.indexOf(node);
  if (currentIndex > 0) {
    const previousNode = node.parent.children[currentIndex - 1];
    return previousNode;
  }
  return null;
}

export function disableLayout(node: Node) {
  const layout = node.getComponent(Layout);
  if (layout) {
    layout.enabled = false;
  }
}

export function findParentWithComponent(node: Node, comp: string) {
  const parent = node.parent;
  if (parent) {
    const parentComponent = parent.getComponent(comp);
    if (parentComponent) {
      return parent;
    }
    return findParentWithComponent(parent, comp);
  }
  return null;
}

/**
 * 递归搜索下级节点，找到所有符合条件的节点
 * @param parentNode 父节点，从此节点开始搜索
 * @param condition 条件回调函数，返回true表示找到目标节点
 * @returns 找到的所有符合条件的节点数组
 */
export function findChildNodes(
  parentNode: Node,
  condition: (node: Node) => boolean
): Node[] {
  const results: Node[] = [];

  // 先检查当前节点是否符合条件
  if (condition(parentNode)) {
    results.push(parentNode);
  }

  // 递归搜索所有子节点
  for (const child of parentNode.children) {
    const childResults = findChildNodes(child, condition);
    results.push(...childResults);
  }

  return results;
}

/**
 * 洗牌算法 - 支持混合类型数组
 */
export function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function playAnimationInNode(node: Node) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const animation = node.getComponent(Animation);
    animation.on(Animation.EventType.FINISHED, () => {
      node.active = false;
      resolve('');
    });
    animation.play();
  });
}

export function playSpineInNode(node: Node) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const spine = node.getComponent(sp.Skeleton);
    spine.setCompleteListener(() => {
      spine.setCompleteListener(null);
      node.active = false;
      resolve('');
    });
    const aniName = getSpineAnimationNames(spine)[0];
    if (!aniName) {
      console.error('没有找到spine动画');
      return;
    }
    spine.setAnimation(0, aniName, false);
  });
}

export function progressiveMove({
  nodeList,
  intervalDelay = 0.2,
  animationDuration = 0.3,
  offsetX = 0,
  offsetY = 0,
  easing = 'quadOut',
  isPlayAudio = true
}: {
  nodeList: Node[];
  intervalDelay: number;
  animationDuration: number;
  offsetX: number;
  offsetY: number;
  easing?: TweenEasing;
  isPlayAudio?: boolean;
}) {
  return new Promise(resolve => {
    if (nodeList.length === 0) {
      resolve('');
      return;
    }
    hideNodes(nodeList);
    let completedCount = 0;
    const totalNodeLength = nodeList.length;

    nodeList.forEach((node, index) => {
      const delay = index * intervalDelay;
      setTimeout(() => {
        const startPos = new Vec3(
          node.position.x + offsetX,
          node.position.y + offsetY,
          node.position.z
        );
        if (isPlayAudio) {
          // playOneShot(AUDIO_ENUM.弹出);
        }
        moveIn(
          node,
          startPos,
          node.position.clone(),
          animationDuration,
          easing
        ).then(() => {
          completedCount++;
          if (completedCount === totalNodeLength) {
            resolve('');
          }
        });
      }, delay * 1000);
    });
  });
}

/**
 * 递进缩放
 * @param nodeList
 * @param intervalDelay
 * @param animationDuration
 * @returns
 */
export function progressiveZoom(
  nodeList: Node[],
  intervalDelay: number = 0.2,
  animationDuration: number = 0.3
) {
  return new Promise(resolve => {
    if (nodeList.length === 0) {
      resolve('');
      return;
    }
    hideNodes(nodeList);
    let completedCount = 0;
    const totalNodeLength = nodeList.length;

    nodeList.forEach((node, index) => {
      const delay = index * intervalDelay;
      setTimeout(() => {
        scaleIn(node, animationDuration).then(() => {
          completedCount++;
          if (completedCount === totalNodeLength) {
            resolve('');
          }
        });
      }, delay * 1000);
    });
  });
}

/**
 * 设置锚点
 * @param anchorX X轴锚点 (0-1)
 * @param anchorY Y轴锚点 (0-1)
 */
export function setAnchorPoint(
  node: Node,
  anchorX: number,
  anchorY: number
): void {
  if (node) {
    const uiTransform = node.getComponent(UITransform);
    if (uiTransform) {
      uiTransform.anchorPoint = new Vec2(anchorX, anchorY);
    }
  }
}

export function addNodeToParent(node: Node, parent?: Node) {
  if (!parent) {
    parent = find('Canvas');
  }
  const localPos = parent
    .getComponent(UITransform)
    .convertToNodeSpaceAR(node.worldPosition);
  node.setPosition(localPos);
  parent.addChild(node);
}

export function disableCollider(node: Node) {
  const collider = node.getComponent(Collider2D);
  if (collider) {
    collider.enabled = false;
  }
}

export function enableCollider(node: Node) {
  const collider = node.getComponent(Collider2D);
  if (collider) {
    collider.enabled = true;
  }
}

export function setAnimationSpeed(node: Node, speed: number) {
  const animation = node.getComponent(Animation);
  const state = animation.getState(animation.defaultClip.name);
  if (state) {
    state.speed = speed;
  }
}
