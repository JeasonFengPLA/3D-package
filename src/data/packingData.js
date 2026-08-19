/**
 * ============================================================
 * 三维装箱数据格式说明
 * ============================================================
 *
 * 一、外层箱子 container（单个对象，固定展示）
 * ------------------------------------------------------------
 * {
 *   length: 120,   // 箱子长度 L（单位：cm，数值 > 0）
 *   width:  80,    // 箱子宽度 W（单位：cm，数值 > 0）
 *   height: 60,    // 箱子高度 H（单位：cm，数值 > 0）
 *   unit:   'cm'   // 尺寸单位（仅用于展示，可选，默认 'cm'）
 * }
 *
 * 二、内层货物数组 cargoList（后端返回的数组，动态渲染）
 * ------------------------------------------------------------
 * [
 *   {
 *     id: 'cargo-001',                    // 货物唯一标识（必填）
 *     name: '货物A',                      // 货物名称，用于提示信息（可选）
 *     length: 30,                         // 货物长度（必填，数值 > 0）
 *     width: 20,                          // 货物宽度（必填，数值 > 0）
 *     height: 15,                         // 货物高度（必填，数值 > 0）
 *     weight: 12.5,                       // 重量 kg（可选，仅展示）
 *     color: '#409EFF',                   // 颜色（可选，不传则自动分配）
 *     canTilt: true,                      // 是否可倾倒（可选，默认 true；
 *                                          // false 时固定高度不可变更。
 *                                          // true 时支持两种姿态变化：
 *                                          // 倾倒 = 绕 X 轴 90°（高 ↔ 宽），
 *                                          // 立起 = 绕 Z 轴 90°（高 ↔ 长））
 *     canStack: true,                     // 是否可挤压（可选，默认 true；
 *                                          // 当前暂不处理逻辑，仅数据属性）
 *     canRotate: true,                    // 是否可旋转（可选，默认 true；
 *                                          // false 时禁止在三维界面旋转）
 *     position: { x: 15, y: 10, z: 7.5 }, // 放置位置【货物中心点坐标】（可选，见下方说明）
 *     rotation: { x: 0, y: 0, z: 0 }      // 旋转角度（弧度，可选，默认 0）
 *   }
 * ]
 *
 * 三、坐标约定（重要，y/z 已对换）
 * ------------------------------------------------------------
 * - 外层大箱子的【左下角】位于 Three.js 坐标原点 (0, 0, 0)，
 *   箱子占据正象限空间：x ∈ [0, length]，y ∈ [0, width]，z ∈ [0, height]
 * - 数据语义：
 *   position.x = 长度方向（左右）
 *   position.y = 宽度方向（前后）
 *   position.z = 高度方向（上下）
 * - position 为货物的【几何中心】坐标，不是角点
 * - 例如货物 30×20×15（长×宽×高）平放于箱底左下角时，
 *   position = { x: 15, y: 10, z: 7.5 }
 * - 若后端已通过装箱算法算出位置，请在 position 字段直接返回；
 *   若暂时不提供 position，组件会启用内置的"贪心自动排布"算法
 *   从 (0,0,0) 出发按顺序将货物贴着箱底/已放货物逐层堆叠（演示模式）。
 *
 * 四、箱子大小覆盖
 * ------------------------------------------------------------
 * 组件会根据 container 的长宽高自动生成箱子并自适应相机视野，
 * 货物超出箱子尺寸时会以红色边框高亮提示。
 *
 * 五、外层箱子透明度
 * ------------------------------------------------------------
 * 通过组件 prop `containerOpacity`（0 ~ 1）控制，
 * 也可在页面上用滑块实时调整，组件内已内置控制滑块。
 * ============================================================
 */

/** 模拟后端返回：外层箱子 */
export const container = {
  length: 120,
  width: 80,
  height: 60,
  unit: 'cm',
}

/** 模拟后端返回：内层货物数组 */
export const cargoList = [
  {
    id: 'cargo-001',
    name: '货物A',
    length: 30,
    width: 20,
    height: 15,
    weight: 12.5,
    color: '#409EFF',
    canTilt: true,
    canStack: true,
    canRotate: true,
  },
  {
    id: 'cargo-002',
    name: '货物B',
    length: 25,
    width: 25,
    height: 20,
    weight: 8,
    color: '#67C23A',
    canTilt: false,
    canStack: true,
    canRotate: false,
  },
  {
    id: 'cargo-003',
    name: '货物C',
    length: 40,
    width: 15,
    height: 10,
    weight: 5,
    color: '#E6A23C',
    canTilt: true,
    canStack: false,
    canRotate: true,
  },
  {
    id: 'cargo-004',
    name: '货物D',
    length: 20,
    width: 20,
    height: 20,
    weight: 15,
    color: '#F56C6C',
    canTilt: false,
    canStack: true,
    canRotate: true,
  },
  {
    id: 'cargo-005',
    name: '货物E',
    length: 35,
    width: 30,
    height: 25,
    weight: 20,
    color: '#909399',
    canTilt: true,
    canStack: true,
    canRotate: true,
  },
  {
    id: 'cargo-006',
    name: '货物F',
    length: 18,
    width: 15,
    height: 12,
    weight: 3.5,
    canTilt: true,
    canStack: true,
    canRotate: true,
  },
  {
    id: 'cargo-007',
    name: '货物G',
    length: 50,
    width: 20,
    height: 15,
    weight: 10,
    canTilt: false,
    canStack: false,
    canRotate: false,
  },
]
