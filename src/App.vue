<template>
  <div class="app-page">
    <h2 class="app-page__title">三维装箱演示</h2>

    <el-row :gutter="16">
      <!-- 左侧：数据控制 -->
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>
            <span>外层箱子参数（来自数据）</span>
          </template>

          <el-form label-width="64px" size="default">
            <el-form-item label="长度 L">
              <el-input-number v-model="currentContainer.length" :min="1" :step="10" style="width: 100%" />
            </el-form-item>
            <el-form-item label="宽度 W">
              <el-input-number v-model="currentContainer.width" :min="1" :step="10" style="width: 100%" />
            </el-form-item>
            <el-form-item label="高度 H">
              <el-input-number v-model="currentContainer.height" :min="1" :step="10" style="width: 100%" />
            </el-form-item>
          </el-form>

          <el-divider content-position="left">示例数据（演示箱子大小覆盖）</el-divider>
          <el-space wrap>
            <el-button size="small" @click="useSmallBox">小箱 60×40×30</el-button>
            <el-button size="small" type="primary" @click="useMediumBox">中箱 120×80×60</el-button>
            <el-button size="small" @click="useLargeBox">大箱 200×120×100</el-button>
          </el-space>

          <el-divider content-position="left">货物数量</el-divider>
          <el-form-item>
            <el-input-number v-model="cargoCount" :min="1" :max="sourceCargoList.length" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">数据格式说明</el-divider>
          <el-collapse>
            <el-collapse-item title="外层箱子 container" name="container">
              <pre class="app-page__code">{{ containerFormat }}</pre>
            </el-collapse-item>
            <el-collapse-item title="内层货物 cargoList" name="cargo">
              <pre class="app-page__code">{{ cargoFormat }}</pre>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>

      <!-- 右侧：3D 视图 -->
      <el-col :xs="24" :md="16">
        <BinPacking3D
          :container="currentContainer"
          :cargo-list="displayCargoList"
          :container-opacity="containerOpacity"
          class="app-page__viewer"
          @import="handleImport"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BinPacking3D from '@/components/BinPacking3D.vue'
import { container, cargoList } from '@/data/packingData.js'

// 当前箱子（可直接修改，修改后 3D 场景自动重建）
const currentContainer = ref({ ...container })

// 箱子透明度：此处设置后传递给组件，组件内滑块可同步调整
const containerOpacity = ref(0.3)

// 货物数据（响应式，支持导入替换）
const sourceCargoList = ref(cargoList.map(normalizeCargo))

// 归一化货物数据：补充 id 与属性默认值（缺省均可倾倒/挤压/旋转）
function normalizeCargo(g, index) {
  return {
    ...g,
    id: g.id ?? `cargo-${index + 1}`,
    canTilt: g.canTilt !== false,
    canStack: g.canStack !== false,
    canRotate: g.canRotate !== false,
  }
}

// 货物数量控制（演示动态渲染）
const cargoCount = ref(sourceCargoList.value.length)
const displayCargoList = computed(() => sourceCargoList.value.slice(0, cargoCount.value))

// 导入摆放数据：更新箱子与货物
function handleImport(data) {
  currentContainer.value = { ...data.container, unit: data.container.unit || 'cm' }
  sourceCargoList.value = (data.cargoList || []).map(normalizeCargo)
  cargoCount.value = sourceCargoList.value.length
}

// 示例：不同尺寸箱子演示"大小覆盖"
const useSmallBox = () => {
  currentContainer.value = { length: 60, width: 40, height: 30, unit: 'cm' }
}
const useMediumBox = () => {
  currentContainer.value = { length: 120, width: 80, height: 60, unit: 'cm' }
}
const useLargeBox = () => {
  currentContainer.value = { length: 200, width: 120, height: 100, unit: 'cm' }
}

// 数据格式说明文本
const containerFormat = `{
  length: 120,   // 长 L（cm）
  width: 80,     // 宽 W（cm）
  height: 60,    // 高 H（cm）
  unit: 'cm'     // 单位（可选）
}`

const cargoFormat = `[
  {
    id: 'cargo-001',                 // 唯一标识（必填）
    name: '货物A',                   // 名称（可选）
    length: 30, width: 20, height: 15, // 尺寸（必填）
    weight: 12.5,                    // 重量 kg（可选）
    color: '#409EFF',                // 颜色（可选）
    canTilt: true,                   // 是否可倾倒（默认 true，
                                     // false 时高度固定）
    canStack: true,                  // 是否可挤压（默认 true，
                                     // 暂不处理逻辑）
    canRotate: true,                 // 是否可旋转（默认 true，
                                     // false 时禁止旋转）
    position: { x, y, z },           // 中心点坐标（可选，
                                     // y=前后/宽方向，z=上下/高方向，
                                     // 原点在箱子左下角 (0,0,0)）
    rotation: { x: 0, y: 0, z: 0 }   // 旋转弧度（可选）
  }
]`
</script>

<style scoped>
.app-page {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.app-page__title {
  margin: 0 0 16px;
  font-size: 20px;
  color: #303133;
}

.app-page__viewer {
  height: 640px;
}

.app-page__code {
  margin: 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #476582;
  white-space: pre-wrap;
}
</style>
