<template>
  <div class="bin-packing-3d">
    <div ref="mountRef" class="bin-packing-3d__canvas"></div>

    <!-- 顶部控制条 -->
    <div class="bin-packing-3d__toolbar">
      <div class="bin-packing-3d__opacity">
        <span class="bin-packing-3d__label">箱子透明度</span>
        <el-slider
          v-model="opacity"
          :min="0.05"
          :max="1"
          :step="0.05"
          size="small"
          style="width: 160px"
          @input="onOpacityInput"
        />
        <span class="bin-packing-3d__value">{{ opacity.toFixed(2) }}</span>
      </div>
      <el-button size="small" @click="replayAnimation">重新播放</el-button>
      <el-button size="small" type="primary" plain @click="openExportDialog">导出摆放数据</el-button>
      <el-button size="small" plain @click="openImportDialog">导入摆放数据</el-button>
      <el-switch v-model="autoRotate" active-text="自动旋转" size="small" style="margin-left: 8px" />
      <span class="bin-packing-3d__tip">鼠标左键旋转 · 滚轮缩放 · 右键平移</span>
    </div>

    <!-- 箱子尺寸标注 -->
    <div class="bin-packing-3d__size">
      外层箱子：{{ container.length }} × {{ container.width }} × {{ container.height }} {{ unit }}
    </div>

    <!-- 货物统计 -->
    <div class="bin-packing-3d__stats">
      货物 {{ cargoList.length }} 件 · 体积占用
      {{ occupiedRatio.toFixed(1) }}%
    </div>

    <!-- 选中货物：三维坐标滑块面板 -->
    <div
      v-if="selectedCargo && cargoPositions[selectedId]"
      class="bin-packing-3d__inspector"
    >
      <div class="bin-packing-3d__inspector-head">
        <span class="bin-packing-3d__inspector-title">
          {{ selectedCargo.name || selectedCargo.id }}
          <span class="bin-packing-3d__inspector-id">{{ selectedCargo.id }}</span>
        </span>
        <el-button link size="small" @click="clearSelection">关闭</el-button>
      </div>
      <div class="bin-packing-3d__inspector-meta">
        尺寸：{{ selectedDimsText }}
      </div>
      <div class="bin-packing-3d__inspector-attrs">
        <span class="bin-packing-3d__inspector-attr">
          可倾倒
          <el-switch :model-value="cargoAttrs?.canTilt" size="small" @change="(v) => onAttrToggle('canTilt', v)" />
        </span>
        <span class="bin-packing-3d__inspector-attr">
          可挤压
          <el-switch :model-value="cargoAttrs?.canStack" size="small" @change="(v) => onAttrToggle('canStack', v)" />
        </span>
        <span class="bin-packing-3d__inspector-attr">
          可旋转
          <el-switch :model-value="cargoAttrs?.canRotate" size="small" @change="(v) => onAttrToggle('canRotate', v)" />
        </span>
      </div>
      <div class="bin-packing-3d__inspector-ops">
        <el-button size="small" type="primary" plain :disabled="cargoAttrs?.canRotate === false" @click="rotateSelected">旋转 90°</el-button>
        <el-button size="small" type="warning" plain :disabled="cargoAttrs?.canTilt === false" @click="tiltXSelected">
          {{ cargoPositions[selectedId]?.tilt === 1 ? '倾倒复位' : '倾倒' }}
        </el-button>
        <el-button size="small" type="danger" plain :disabled="cargoAttrs?.canTilt === false" @click="tiltZSelected">
          {{ cargoPositions[selectedId]?.tilt === 2 ? '立起复位' : '立起' }}
        </el-button>
      </div>
      <div class="bin-packing-3d__inspector-row">
        <span class="bin-packing-3d__inspector-axis bin-packing-3d__inspector-axis--x">X</span>
        <el-slider
          v-model="cargoPositions[selectedId].x"
          :min="posRange.x[0]"
          :max="posRange.x[1]"
          :step="1"
          size="small"
        />
        <el-input-number
          v-model="cargoPositions[selectedId].x"
          :min="posRange.x[0]"
          :max="posRange.x[1]"
          :step="1"
          size="small"
          controls-position="right"
          class="bin-packing-3d__inspector-num"
        />
      </div>
      <!-- 注：Y 滑块控制前后方向（数据源为 z），Z 滑块控制上下方向（数据源为 y） -->
      <div class="bin-packing-3d__inspector-row">
        <span class="bin-packing-3d__inspector-axis bin-packing-3d__inspector-axis--z">Y</span>
        <el-slider
          v-model="cargoPositions[selectedId].z"
          :min="posRange.z[0]"
          :max="posRange.z[1]"
          :step="1"
          size="small"
        />
        <el-input-number
          v-model="cargoPositions[selectedId].z"
          :min="posRange.z[0]"
          :max="posRange.z[1]"
          :step="1"
          size="small"
          controls-position="right"
          class="bin-packing-3d__inspector-num"
        />
      </div>
      <div class="bin-packing-3d__inspector-row">
        <span class="bin-packing-3d__inspector-axis bin-packing-3d__inspector-axis--y">Z</span>
        <el-slider
          v-model="cargoPositions[selectedId].y"
          :min="posRange.y[0]"
          :max="posRange.y[1]"
          :step="1"
          size="small"
        />
        <el-input-number
          v-model="cargoPositions[selectedId].y"
          :min="posRange.y[0]"
          :max="posRange.y[1]"
          :step="1"
          size="small"
          controls-position="right"
          class="bin-packing-3d__inspector-num"
        />
      </div>
      <div class="bin-packing-3d__inspector-foot">
        拖动滑块或直接输入坐标；碰撞/出界位置会被自动钳制到最近可移动处
      </div>
    </div>

    <!-- 导出 JSON 弹框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="当前货物摆放数据（JSON）"
      width="640px"
      append-to-body
    >
      <div class="bin-packing-3d__export">
        <pre class="bin-packing-3d__export-json">{{ exportJsonText }}</pre>
      </div>
      <template #footer>
        <el-button size="small" @click="exportDialogVisible = false">关闭</el-button>
        <el-button size="small" type="primary" @click="copyExportJson">复制 JSON</el-button>
      </template>
    </el-dialog>

    <!-- 导入 JSON 弹框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入货物摆放数据（粘贴 JSON）"
      width="640px"
      append-to-body
    >
      <el-input
        v-model="importText"
        type="textarea"
        :rows="14"
        placeholder="粘贴导出的 JSON 数据，格式与「导出摆放数据」一致"
      />
      <template #footer>
        <el-button size="small" @click="importDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="applyImport">导入并渲染</el-button>
      </template>
    </el-dialog>

    <!-- 超界提示 -->
    <el-alert
      v-if="oversizedNames.length"
      :title="`以下货物超出外层箱子范围：${oversizedNames.join('、')}`"
      type="warning"
      :closable="false"
      class="bin-packing-3d__alert"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  /** 外层箱子：{ length, width, height, unit } */
  container: {
    type: Object,
    required: true,
  },
  /** 内层货物数组，见 src/data/packingData.js 中的格式说明 */
  cargoList: {
    type: Array,
    default: () => [],
  },
  /** 外层箱子透明度（0 ~ 1），由调用方控制 */
  containerOpacity: {
    type: Number,
    default: 0.3,
  },
  /** 是否自动旋转视角 */
  autoRotate: {
    type: Boolean,
    default: true,
  },
  /** 尺寸单位 */
  unit: {
    type: String,
    default: 'cm',
  },
  /** 是否播放"货物落入"动画 */
  animate: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['ready', 'cargo-click', 'import'])

const mountRef = ref(null)
const opacity = ref(props.containerOpacity)
const autoRotate = ref(props.autoRotate)
const oversizedNames = ref([])

// ---------- 选中货物与坐标控制 ----------
// 当前选中货物的 id（点击 3D 场景中的货物选中）
const selectedId = ref(null)
// 所有货物的实时三维坐标：{ [cargoId]: { x, y, z } }
const cargoPositions = reactive({})
// 上一次同步的合法位置（用于识别滑块拖动了哪根轴，非响应式）
const lastPositions = {}
// 碰撞判定浮点容差（cm）
const EPS = 1e-6

// ---------- 导出摆放数据 ----------
const exportDialogVisible = ref(false)
const exportJsonText = ref('')

// ---------- 导入摆放数据 ----------
const importDialogVisible = ref(false)
const importText = ref('')

// 数值保留两位小数（用于导出）
function round2(v) {
  return Math.round(v * 100) / 100
}

// 规整浮点运算产生的精度尾巴（如 15.000001000000002 → 15.000001），
// 避免限位/累加计算后的坐标出现异常小数位
function tidy(v) {
  return Math.round(v * 1e6) / 1e6
}

// 货物属性（可倾倒 / 可挤压 / 可旋转），缺省视为 true
function cargoAttrsOf(g, pos) {
  const src = pos || g || {}
  return {
    canTilt: src.canTilt !== false,
    canStack: src.canStack !== false,
    canRotate: src.canRotate !== false,
  }
}

// 有效尺寸（考虑倾倒状态）：
// tilt = 0 不倒；tilt = 1 绕 X 轴 90°（高 ↔ 宽）；tilt = 2 绕 Z 轴 90°（高 ↔ 长，即“立起”）
function effectiveSize(g, tilt) {
  if (tilt === 1) return { l: g.length, w: g.height, h: g.width }
  if (tilt === 2) return { l: g.height, w: g.width, h: g.length }
  return { l: g.length, w: g.width, h: g.height }
}

// 由有效尺寸 + 水平旋转状态计算最终渲染尺寸 dims（x/y/z 三个方向）
function calcDims(g, tilt, rot) {
  const eff = effectiveSize(g, tilt)
  return {
    x: rot ? eff.w : eff.l,
    y: eff.h,
    z: rot ? eff.l : eff.w,
  }
}

// 生成当前摆放数据 JSON（控制台输出 + 弹框展示）
function openExportDialog() {
  const data = {
    container: { ...props.container },
    cargoList: cargoMeshes.map((mesh) => {
      const g = mesh.userData.cargo
      const pos = cargoPositions[g.id] || mesh.position
      const state = cargoPositions[g.id]
      // 尺寸输出为有效尺寸（倾倒/立起后已互换尺寸）
      const eff = effectiveSize(g, state?.tilt)
      const item = {
        id: g.id,
        length: eff.l,
        width: eff.w,
        height: eff.h,
        canTilt: state ? state.canTilt !== false : true,
        canStack: state ? state.canStack !== false : true,
        canRotate: state ? state.canRotate !== false : true,
      }
      if (g.name) item.name = g.name
      if (typeof g.weight === 'number') item.weight = g.weight
      item.color = '#' + mesh.userData.color.getHexString()
      // position 按新语义输出：y = 前后/宽方向，z = 上下/高方向
      item.position = { x: round2(pos.x), y: round2(pos.z), z: round2(pos.y) }
      // 水平旋转状态输出到 rotation.y（倾倒已固化到尺寸中）
      item.rotation = { x: 0, y: round2(state?.rot ? Math.PI / 2 : 0), z: 0 }
      return item
    }),
  }
  const json = JSON.stringify(data, null, 2)
  exportJsonText.value = json
  console.log('【三维装箱】当前货物摆放数据：\n' + json)
  exportDialogVisible.value = true
}

// 复制 JSON 到剪贴板
async function copyExportJson() {
  try {
    await navigator.clipboard.writeText(exportJsonText.value)
    ElMessage.success('JSON 已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// ---------- 导入摆放数据 ----------
function openImportDialog() {
  importText.value = ''
  importDialogVisible.value = true
}

function applyImport() {
  try {
    const data = JSON.parse(importText.value)
    if (!data.container || !data.cargoList || !Array.isArray(data.cargoList)) {
      throw new Error('数据格式不正确：需要 container 与 cargoList')
    }
    if (!data.container.length || !data.container.width || !data.container.height) {
      throw new Error('container 缺少 length/width/height')
    }
    emit('import', data)
    importDialogVisible.value = false
    importText.value = ''
    ElMessage.success(`导入成功：${data.cargoList.length} 件货物`)
  } catch (e) {
    ElMessage.error(`导入失败：${e.message}`)
  }
}

// ---------- Three.js 内部状态 ----------
let renderer = null
let scene = null
let camera = null
let controls = null
let containerGroup = null
let cargoGroup = null
let ground = null
let raycaster = null
let pointer = null
let animationId = null
let resizeObserver = null
let disposed = false
let cargoMeshes = []

// ---------- 动画状态 ----------
let animItems = [] // { mesh, from, to, delay }
let animStart = null
let animDuration = 1200

// ---------- 统计：货物体积占用 ----------
const occupiedRatio = computed(() => {
  const c = props.container
  if (!c || !c.length || !c.width || !c.height) return 0
  const boxVol = c.length * c.width * c.height
  const cargoVol = props.cargoList.reduce(
    (sum, g) => sum + (g.length || 0) * (g.width || 0) * (g.height || 0),
    0
  )
  return (cargoVol / boxVol) * 100
})

// ---------- 透明度控制 ----------
watch(
  () => props.containerOpacity,
  (v) => {
    opacity.value = v
    applyOpacity(v)
  }
)

function onOpacityInput(v) {
  applyOpacity(v)
}

function applyOpacity(v) {
  if (!containerGroup) return
  containerGroup.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.transparent) {
      obj.material.opacity = v
    }
  })
}

// ---------- 初始化 ----------
function initScene() {
  const el = mountRef.value
  if (!el) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f7fa)

  camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 5000)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth, el.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  el.appendChild(renderer.domElement)

  // 灯光
  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(200, 300, 200)
  dirLight.castShadow = true
  scene.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
  dirLight2.position.set(-200, 100, -200)
  scene.add(dirLight2)

  // 地面网格
  ground = new THREE.GridHelper(600, 30, 0xcdd3da, 0xe2e7ec)
  scene.add(ground)
  // 控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 20
  controls.maxDistance = 2000

  // 拾取
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()
  renderer.domElement.addEventListener('click', onCanvasClick)

  // 自适应
  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(el)

  // 动画循环
  const loop = () => {
    if (disposed) return
    animationId = requestAnimationFrame(loop)
    updateAnimation()
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  emit('ready')
}

// ---------- 构建箱子与货物 ----------
function buildScene() {
  const c = props.container
  if (!c || !c.length || !c.width || !c.height) return
  const L = c.length
  const W = c.width
  const H = c.height

  // 清空旧内容
  if (containerGroup) scene.remove(containerGroup)
  if (cargoGroup) scene.remove(cargoGroup)
  containerGroup = new THREE.Group()
  cargoGroup = new THREE.Group()
  scene.add(containerGroup)
  scene.add(cargoGroup)
  cargoMeshes = []
  oversizedNames.value = []
  // 清空坐标存储（将在下方按排布结果重新填充）
  Object.keys(cargoPositions).forEach((k) => delete cargoPositions[k])
  Object.keys(lastPositions).forEach((k) => delete lastPositions[k])

  // ---- 外层箱子：半透明实体 + 边线 ----
  // 坐标约定：箱子左下角位于 Three.js 原点 (0,0,0)，
  // 箱子占据正象限 [0, L] × [0, H] × [0, W]
  const boxGeo = new THREE.BoxGeometry(L, H, W)
  const boxMat = new THREE.MeshPhongMaterial({
    color: 0x4a7dff,
    transparent: true,
    opacity: opacity.value,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const boxMesh = new THREE.Mesh(boxGeo, boxMat)
  boxMesh.position.set(L / 2, H / 2, W / 2)
  boxMesh.castShadow = false
  containerGroup.add(boxMesh)

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2f54eb, linewidth: 1 })
  const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat)
  edgeLines.position.copy(boxMesh.position)
  containerGroup.add(edgeLines)

  // 底部参考面（防止透视穿帮）
  const floorGeo = new THREE.PlaneGeometry(L, W)
  const floorMat = new THREE.MeshBasicMaterial({ color: 0xe8efff, transparent: true, opacity: 0.35 })
  const floorMesh = new THREE.Mesh(floorGeo, floorMat)
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.position.set(L / 2, 0.01, W / 2)
  containerGroup.add(floorMesh)

  // 地面网格跟随箱子底部
  if (ground) ground.position.set(L / 2, 0, W / 2)

  // 尺寸标注精灵
  const sizeLabel = makeTextSprite(`${L} × ${W} × ${H} ${props.unit}`)
  sizeLabel.position.set(L / 2, H + 18, W / 2)
  containerGroup.add(sizeLabel)

  // ---- 内层货物 ----
  const arranged = arrangeCargo(c)

  arranged.forEach((item, index) => {
    const g = item.cargo
    // 记录实时坐标与交互状态（供 X/Y/Z 滑块、旋转/倾倒控制）
    const state = {
      x: tidy(item.x),
      y: tidy(item.y),
      z: tidy(item.z),
      rot: !!item.rotationY,
      tilt: 0,
      ...cargoAttrsOf(g),
    }
    cargoPositions[g.id] = state
    lastPositions[g.id] = { x: state.x, y: state.y, z: state.z }
    createCargoMesh(g, index)
  })

  // ---- 相机适配 ----
  fitCamera(L, W, H)

  // ---- 播放动画 ----
  if (props.animate) {
    cargoMeshes.forEach((mesh, i) => {
      const from = new THREE.Vector3(mesh.position.x, H + 60, mesh.position.z)
      const to = mesh.position.clone()
      animItems.push({
        mesh,
        from,
        to,
        delay: i * 260,
      })
    })
    animStart = null
    if (animItems.length) animStart = performance.now()
  }
}

// 货物调色板
const PALETTE = [0x409eff, 0x67c23a, 0xe6a23c, 0xf56c6c, 0x909399, 0x9b59b6, 0x1abc9c, 0xe84393, 0x00cec9, 0xf39c12]

// 创建单个货物 mesh（几何尺寸由倾倒/旋转状态决定，位置来自 cargoPositions）
function createCargoMesh(g, index) {
  const pos = cargoPositions[g.id] || { x: 0, y: 0, z: 0, rot: false, tilt: 0 }
  const rot = !!pos.rot
  const dims = calcDims(g, pos.tilt || 0, rot)

  const geo = new THREE.BoxGeometry(dims.x, dims.y, dims.z)
  const color = g.color ? new THREE.Color(g.color) : new THREE.Color(PALETTE[index % PALETTE.length])
  const mat = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    specular: 0x444444,
    shininess: 30,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 边线
  const edgeMat2 = new THREE.LineBasicMaterial({ color: 0x222222 })
  const edgeLines2 = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat2)
  mesh.add(edgeLines2)

  mesh.position.set(pos.x, pos.y, pos.z)

  // 存储货物数据，供拾取、重播、碰撞与选中高亮
  mesh.userData = {
    cargo: g,
    cargoId: g.id,
    color,
    dims,
    tilt: pos.tilt || 0,
    rot,
    oversized: false,
    edge: edgeLines2,
  }

  // 货物名称标注（悬浮于货物上方，作为货物子对象随其移动）
  const label = makeTextSprite(g.name || g.id || '', { scale: 0.55, color: '#333333' })
  label.position.set(0, dims.y / 2 + 5, 0)
  mesh.add(label)

  // 超界红色外框（尺寸随有效尺寸变化）
  const warnBox = new THREE.Box3(
    new THREE.Vector3(-dims.x / 2, -dims.y / 2, -dims.z / 2),
    new THREE.Vector3(dims.x / 2, dims.y / 2, dims.z / 2)
  )
  mesh.add(new THREE.Box3Helper(warnBox, 0xff3b30))
  mesh.userData.warnBox = warnBox

  // 超界初判（需在位置设置后）
  mesh.userData.oversized = checkMeshBounds(mesh)

  cargoGroup.add(mesh)
  cargoMeshes.push(mesh)
  return mesh
}

// 基于现有 cargoPositions 重建全部货物 mesh（保留摆放位置，用于旋转/倾倒）
function rebuildCargoMeshes() {
  if (!cargoGroup) return
  animItems = []
  animStart = null
  // 清理旧货物
  while (cargoGroup.children.length) {
    const child = cargoGroup.children[0]
    child.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
    })
    cargoGroup.remove(child)
  }
  cargoMeshes = []
  props.cargoList.forEach((g, index) => {
    if (!cargoPositions[g.id]) {
      cargoPositions[g.id] = { x: 0, y: 0, z: 0, rot: false, tilt: 0, ...cargoAttrsOf(g) }
      lastPositions[g.id] = { x: 0, y: 0, z: 0 }
    }
    createCargoMesh(g, index)
  })
  refreshOversizedNames()
  applySelectionHighlight()
}

// 按 id 查找货物 mesh
function findCargoMesh(id) {
  return cargoMeshes.find((m) => m.userData.cargoId === id) || null
}

// ---------- 贪心自动排布（货物未提供 position 时使用） ----------
function arrangeCargo(containerBox) {
  const L = containerBox.length
  const W = containerBox.width
  const H = containerBox.height

  const result = []
  let curY = 0
  let curZ = 0
  let curX = 0
  let rowMaxD = 0
  let levelMaxH = 0

  props.cargoList.forEach((g) => {
    // 后端已提供位置：直接采用（position.y = 前后/宽方向，position.z = 上下/高方向）
    if (g.position && typeof g.position.x === 'number') {
      result.push({
        cargo: g,
        x: g.position.x,
        y: g.position.z ?? g.height / 2,
        z: g.position.y ?? g.width / 2,
        rotationY: g.rotation?.y || 0,
        oversized: g.length > L || g.width > W || g.height > H,
      })
      return
    }

    // 尝试两种水平朝向
    const orientations = [
      { w: g.length, d: g.width, h: g.height },
      { w: g.width, d: g.length, h: g.height },
    ]
    let chosen = orientations.find((o) => o.w <= L && o.d <= W && o.h <= H)
    // 放不进箱子：置于箱体中心，红色高亮
    if (!chosen) {
      result.push({
        cargo: g,
        x: L / 2,
        y: H / 2,
        z: W / 2,
        oversized: true,
      })
      return
    }

    // 当前行放不下 → 换行
    if (curX + chosen.w > L || curY + chosen.h > H) {
      curZ += rowMaxD
      curX = 0
      rowMaxD = 0
    }
    // 新行仍放不下 → 新开一层
    if (curX + chosen.w > L || chosen.d > W || curY + chosen.h > H) {
      curY += levelMaxH
      curZ = 0
      curX = 0
      rowMaxD = 0
      levelMaxH = 0
    }

    const y = curY + chosen.h / 2
    const oversized = curY + chosen.h > H
    // 高度不足时：贴顶放置并标红提示（仍保持在箱内）
    result.push({
      cargo: g,
      x: curX + chosen.w / 2,
      y: oversized ? H - chosen.h / 2 : y,
      z: curZ + chosen.d / 2,
      rotationY: chosen.w === g.length ? 0 : Math.PI / 2,
      oversized,
    })

    curX += chosen.w
    rowMaxD = Math.max(rowMaxD, chosen.d)
    levelMaxH = Math.max(levelMaxH, chosen.h)
  })

  return result
}

// ---------- 文字精灵 ----------
function makeTextSprite(text, opts = {}) {
  const scale = opts.scale || 1
  const color = opts.color || '#2f54eb'
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = 'bold 44px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  const aspect = canvas.width / canvas.height
  sprite.scale.set(80 * scale * aspect, 15 * scale, 1)
  return sprite
}

// ---------- 相机适配 ----------
function fitCamera(L, W, H) {
  const diag = Math.max(L, W, H)
  const dist = diag * 2.2
  // 以箱子中心（而非原点）为观察目标
  const cx = L / 2
  const cy = H * 0.4
  const cz = W / 2
  camera.position.set(cx + dist * 0.7, cy + dist * 0.9, cz + dist * 0.9)
  camera.lookAt(cx, cy, cz)
  controls.target.set(cx, cy, cz)
  controls.update()
}

// ---------- 落箱动画 ----------
function updateAnimation() {
  if (!animItems.length || animStart == null) return
  const elapsed = performance.now() - animStart
  let allDone = true
  animItems.forEach((a) => {
    const t = elapsed - a.delay
    if (t < 0) {
      allDone = false
      return
    }
    const k = Math.min(t / animDuration, 1)
    const ease = 1 - Math.pow(1 - k, 3) // easeOutCubic
    if (k < 1) {
      allDone = false
      a.mesh.position.lerpVectors(a.from, a.to, ease)
    } else {
      a.mesh.position.copy(a.to)
    }
  })
  if (allDone) {
    animItems = []
    animStart = null
  }
}

// ---------- 点击拾取：选中货物 ----------
function onCanvasClick(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(cargoMeshes, false)
  if (!hits.length) {
    // 点击空白处取消选中
    clearSelection()
    return
  }

  const mesh = hits[0].object
  const d = mesh.userData.cargo
  const colorHex = '#' + mesh.userData.color.getHexString()
  selectedId.value = mesh.userData.cargoId
  emit('cargo-click', { ...d, color: colorHex, oversized: mesh.userData.oversized })
}

// ---------- 选中货物：X/Y/Z 滑块面板 ----------
const selectedCargo = computed(() => {
  if (!selectedId.value) return null
  return props.cargoList.find((g) => g.id === selectedId.value) || null
})

// 选中货物的有效尺寸文本（考虑倾倒/旋转）
const selectedDimsText = computed(() => {
  const g = selectedCargo.value
  const pos = cargoPositions[selectedId.value]
  if (!g || !pos) return ''
  const dims = calcDims(g, pos.tilt || 0, pos.rot)
  return `${dims.x} × ${dims.y} × ${dims.z} ${props.unit}`
})

// 选中货物的属性状态（可倾倒/可挤压/可旋转）
const cargoAttrs = computed(() => {
  const pos = cargoPositions[selectedId.value]
  return pos ? cargoAttrsOf(pos, pos) : null
})

// 切换属性开关
function onAttrToggle(key, v) {
  const pos = cargoPositions[selectedId.value]
  if (pos) pos[key] = v
}

// 水平旋转 90°（受「可旋转」属性控制，canRotate=false 时禁用）
function rotateSelected() {
  const pos = cargoPositions[selectedId.value]
  if (!pos || pos.canRotate === false) return
  pos.rot = pos.rot ? 0 : 1
  rebuildCargoMeshes()
  // 旋转后 x/z 占位互换，重新钳制避免出界/碰撞
  const mesh = findCargoMesh(selectedId.value)
  pos.x = tidy(resolveAxisPosition(mesh, 'x', pos.x))
  pos.z = tidy(resolveAxisPosition(mesh, 'z', pos.z))
  mesh.position.set(pos.x, pos.y, pos.z)
  refreshOversizedNames()
  applySelectionHighlight()
}

// 倾倒 / 复位（绕 X 轴旋转 90°，高度 ↔ 宽度互换；受「可倾倒」属性控制，
// canTilt=false 时固定高度不可变更）
function tiltXSelected() {
  const pos = cargoPositions[selectedId.value]
  if (!pos || pos.canTilt === false) return
  pos.tilt = pos.tilt === 1 ? 0 : 1
  rebuildCargoMeshes()
  // 倾倒后高度变化，重新钳制 y（上下）避免穿顶/穿底
  const mesh = findCargoMesh(selectedId.value)
  pos.y = tidy(resolveAxisPosition(mesh, 'y', pos.y))
  mesh.position.set(pos.x, pos.y, pos.z)
  refreshOversizedNames()
  applySelectionHighlight()
}

// 立起 / 复位（绕 Z 轴旋转 90°，高度 ↔ 长度互换，长边朝上；受「可倾倒」属性控制）
function tiltZSelected() {
  const pos = cargoPositions[selectedId.value]
  if (!pos || pos.canTilt === false) return
  pos.tilt = pos.tilt === 2 ? 0 : 2
  rebuildCargoMeshes()
  // 立起后高度变化，重新钳制 y（上下）避免穿顶/穿底
  const mesh = findCargoMesh(selectedId.value)
  pos.y = tidy(resolveAxisPosition(mesh, 'y', pos.y))
  mesh.position.set(pos.x, pos.y, pos.z)
  refreshOversizedNames()
  applySelectionHighlight()
}

// 滑块范围：货物几何中心的可移动区间（基于有效尺寸，考虑倾倒/旋转状态）
const posRange = computed(() => {
  const c = props.container
  const fallback = { x: [0, 100], y: [0, 100], z: [0, 100] }
  if (!selectedCargo.value || !c || !c.length || !c.width || !c.height) return fallback
  const g = selectedCargo.value
  const pos = cargoPositions[selectedId.value]
  const dims = calcDims(g, pos?.tilt || 0, pos?.rot)
  const safe = (half, max) => {
    const min = Math.max(half, 0)
    return [min, Math.max(min, max - half)]
  }
  return {
    x: safe(dims.x / 2, c.length),
    y: safe(dims.y / 2, c.height),
    z: safe(dims.z / 2, c.width),
  }
})

// 取消选中
function clearSelection() {
  selectedId.value = null
}

// 刷新货物边线颜色：选中橙 / 超界红 / 正常黑
function applySelectionHighlight() {
  cargoMeshes.forEach((mesh) => {
    const edge = mesh.userData.edge
    if (!edge) return
    const sel = mesh.userData.cargoId === selectedId.value
    const over = mesh.userData.oversized
    edge.material.color.set(sel ? 0xf5a623 : over ? 0xff3b30 : 0x222222)
  })
}

// 根据实时坐标判断单个货物是否超出外层箱子（基于有效尺寸 dims）
function checkMeshBounds(mesh) {
  const c = props.container
  const d = mesh.userData.dims
  const p = mesh.position
  const out =
    p.x - d.x / 2 < 0 ||
    p.x + d.x / 2 > c.length ||
    p.y - d.y / 2 < 0 ||
    p.y + d.y / 2 > c.height ||
    p.z - d.z / 2 < 0 ||
    p.z + d.z / 2 > c.width
  mesh.userData.oversized = out
  // 超界红框随状态显隐
  if (mesh.userData.warnBox) mesh.userData.warnBox.visible = out
  return out
}

// 重建超界货物名单
function refreshOversizedNames() {
  const names = []
  cargoMeshes.forEach((mesh) => {
    if (checkMeshBounds(mesh)) {
      const g = mesh.userData.cargo
      names.push(g.name || g.id || '未知货物')
    }
  })
  oversizedNames.value = names
}

// 解析货物沿指定轴移动的最终位置（终点合法性判定）：
// 1. 目标位置合法（不与其他货物 AABB 重叠且不超出箱子）→ 直接采用，
//    因此可以跨过障碍移动到任意合法空位（点击滑轨/输入坐标跳转）；
// 2. 目标位置非法 → 钳制到最近的合法位置（贴近障碍/箱壁滑动，不会穿透）
function resolveAxisPosition(mesh, axis, target) {
  const c = props.container
  const g = mesh.userData.cargo
  const d = mesh.userData.dims
  const half = {
    x: d.x / 2,
    y: d.y / 2,
    z: d.z / 2,
  }
  const limits = { x: c.length, y: c.height, z: c.width }
  const min = half[axis]
  const max = limits[axis] - half[axis]
  if (min > max) return min // 货物本身大于箱子：只能原地

  // 1. 目标先按箱子边界钳制
  target = Math.min(Math.max(target, min), max)

  // 2. 收集其他货物在该轴上的禁止区间（其余两轴已重叠时才可能碰撞）
  const forbidden = []
  cargoMeshes.forEach((other) => {
    if (other === mesh) return
    const d2 = other.userData.dims
    const half2 = {
      x: d2.x / 2,
      y: d2.y / 2,
      z: d2.z / 2,
    }
    let blocked = true
    for (const ax of ['x', 'y', 'z']) {
      if (ax === axis) continue
      const dist = Math.abs(other.position[ax] - mesh.position[ax])
      if (dist >= half[ax] + half2[ax] - EPS) {
        blocked = false
        break
      }
    }
    if (!blocked) return
    // 禁止区间使用纯几何边界（不加 EPS，避免精度尾巴注入坐标值）
    const lo = other.position[axis] - (half[axis] + half2[axis])
    const hi = other.position[axis] + (half[axis] + half2[axis])
    forbidden.push([lo, hi])
  })

  // 3. 允许区间列表 = 箱子边界区间 - 禁止区间
  const allowed = []
  if (forbidden.length) {
    forbidden.sort((a, b) => a[0] - b[0])
    let cursor = min
    for (const [lo, hi] of forbidden) {
      const l = Math.max(lo, cursor)
      const h = Math.min(hi, max)
      if (l > cursor) allowed.push([cursor, l])
      cursor = Math.max(cursor, h)
      if (cursor >= max) break
    }
    if (cursor < max) allowed.push([cursor, max])
  } else {
    allowed.push([min, max])
  }
  if (!allowed.length) return min

  // 4. 目标落在任意允许区间内 → 直接采用（支持跨障碍移动）
  for (const [lo, hi] of allowed) {
    if (target >= lo - EPS && target <= hi + EPS) return target
  }

  // 5. 目标非法 → 钳制到距离目标最近的合法位置（贴障碍/箱壁）
  let bestDist = Infinity
  let bestVal = target
  for (const [lo, hi] of allowed) {
    if (target < lo) {
      const d = lo - target
      if (d < bestDist) {
        bestDist = d
        bestVal = lo
      }
    } else if (target > hi) {
      const d = target - hi
      if (d < bestDist) {
        bestDist = d
        bestVal = hi
      }
    }
  }
  return bestVal
}

// 滑块变化 → 碰撞检测并钳制位置（手动调整时暂停落箱动画）
watch(
  cargoPositions,
  () => {
    if (!cargoGroup) return
    animItems = []
    animStart = null

    cargoMeshes.forEach((mesh) => {
      const id = mesh.userData.cargoId
      const pos = cargoPositions[id]
      const last = lastPositions[id]
      if (!pos || !last) return

      // 识别被拖动的轴（滑块一次只动一根轴），逐轴解析合法位置
      for (const ax of ['x', 'y', 'z']) {
        if (Math.abs(pos[ax] - last[ax]) <= EPS) continue
        // 终点合法则直接到达；碰撞/出界则钳制到最近可移动位置，
        // 返回值统一规整，消除限位时的浮点精度尾巴
        pos[ax] = tidy(resolveAxisPosition(mesh, ax, pos[ax]))
      }

      mesh.position.set(pos.x, pos.y, pos.z)
      lastPositions[id] = { x: pos.x, y: pos.y, z: pos.z }
    })

    refreshOversizedNames()
    applySelectionHighlight()
  },
  { deep: true }
)

// 选中变化 → 刷新高亮
watch(selectedId, () => {
  applySelectionHighlight()
})

// ---------- 响应式 ----------
function onResize() {
  const el = mountRef.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

// ---------- 重播 ----------
function replayAnimation() {
  animItems = []
  animStart = null
  if (!cargoGroup) return
  const H = props.container.height || 60
  cargoMeshes.forEach((mesh, i) => {
    const pos = cargoPositions[mesh.userData.cargoId] || { x: 0, y: 0, z: 0 }
    const from = new THREE.Vector3(pos.x, H + 60, pos.z)
    const to = new THREE.Vector3(pos.x, pos.y, pos.z)
    mesh.position.copy(from)
    animItems.push({ mesh, from, to, delay: i * 260 })
  })
  animStart = performance.now()
}
watch(
  () => [props.container, props.cargoList],
  () => {
    animItems = []
    animStart = null
    buildScene()
    // 数据重建后，若选中的货物已不存在则取消选中
    if (selectedId.value && !props.cargoList.some((g) => g.id === selectedId.value)) {
      selectedId.value = null
    }
  },
  { deep: true }
)

watch(autoRotate, (v) => {
  if (controls) controls.autoRotate = v
})

// ---------- 生命周期 ----------
onMounted(() => {
  initScene()
  buildScene()
})

onBeforeUnmount(() => {
  disposed = true
  if (animationId) cancelAnimationFrame(animationId)
  if (resizeObserver) resizeObserver.disconnect()
  if (renderer) {
    renderer.domElement.removeEventListener('click', onCanvasClick)
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
})
</script>

<style scoped>
.bin-packing-3d {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.bin-packing-3d__canvas {
  width: 100%;
  height: 100%;
  min-height: 480px;
}

.bin-packing-3d__canvas :deep(canvas) {
  display: block;
}

.bin-packing-3d__toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.bin-packing-3d__opacity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bin-packing-3d__label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.bin-packing-3d__value {
  font-size: 12px;
  color: #909399;
  width: 32px;
}

.bin-packing-3d__tip {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.bin-packing-3d__size {
  position: absolute;
  top: 64px;
  left: 12px;
  z-index: 10;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  font-size: 13px;
  color: #2f54eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bin-packing-3d__stats {
  position: absolute;
  top: 64px;
  right: 12px;
  z-index: 10;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bin-packing-3d__alert {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  z-index: 10;
}

/* ---------- 选中货物：坐标滑块面板 ---------- */
.bin-packing-3d__inspector {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 320px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #e4e7ed;
  z-index: 10;
}

.bin-packing-3d__inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.bin-packing-3d__inspector-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.bin-packing-3d__inspector-id {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.bin-packing-3d__inspector-meta {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.bin-packing-3d__inspector-attrs {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
}

.bin-packing-3d__inspector-attr {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.bin-packing-3d__inspector-ops {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.bin-packing-3d__inspector-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.bin-packing-3d__inspector-row .el-slider {
  flex: 1;
}

.bin-packing-3d__inspector-axis {
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.bin-packing-3d__inspector-axis--x {
  background: #409eff;
}

.bin-packing-3d__inspector-axis--y {
  background: #67c23a;
}

.bin-packing-3d__inspector-axis--z {
  background: #e6a23c;
}

.bin-packing-3d__inspector-num {
  width: 108px;
  flex-shrink: 0;
}

.bin-packing-3d__inspector-foot {
  margin-top: 6px;
  font-size: 11px;
  color: #c0c4cc;
}

/* ---------- 导出 JSON 弹框 ---------- */
.bin-packing-3d__export-json {
  max-height: 420px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
}
</style>
