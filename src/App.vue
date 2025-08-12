<template>
    <div class="app">
        <header class="topbar">
            <h1>Little Planet Generator</h1>
        </header>

        <section class="controls">
            <div class="uploader">
                <label class="file">
                    <input type="file" accept="image/*" @change="onLoadEqui" />
                    <span>스피어(2:1) 이미지 선택</span>
                </label>
                <label class="file">
                    <input type="file" accept="image/*" @change="onLoadLogo" />
                    <span>바닥 로고(300x300) 선택</span>
                </label>
            </div>
            <div class="toggles">
                <label><input type="checkbox" v-model="showAdvanced" /> 고급 옵션</label>
            </div>
            <div v-if="showAdvanced" class="sliders">
                <div class="group">
                    <div class="row">
                        <label>줌</label>
                        <input type="range" min="0.2" max="3" step="0.01" v-model.number="zoom" />
                        <span>{{ zoom.toFixed(2) }}</span>
                    </div>
                    <div class="row">
                        <label>Yaw</label>
                        <input type="range" min="-180" max="180" step="1" v-model.number="yaw" />
                        <span>{{ yaw.toFixed(0) }}°</span>
                    </div>
                    <div class="row">
                        <label>Pitch</label>
                        <input type="range" min="-90" max="90" step="1" v-model.number="pitch" />
                        <span>{{ pitch.toFixed(0) }}°</span>
                    </div>
                    <div class="row">
                        <label>Roll</label>
                        <input type="range" min="-180" max="180" step="1" v-model.number="roll" />
                        <span>{{ roll.toFixed(0) }}°</span>
                    </div>
                </div>
                <div class="group">
                    <div class="row">
                        <label>로고 X</label>
                        <input type="range" min="-1" max="1" step="0.001" v-model.number="logoX" />
                        <span>{{ logoX.toFixed(3) }}</span>
                    </div>
                    <div class="row">
                        <label>로고 Y</label>
                        <input type="range" min="-1" max="1" step="0.001" v-model.number="logoY" />
                        <span>{{ logoY.toFixed(3) }}</span>
                    </div>
                    <div class="row">
                        <label>로고 크기</label>
                        <input type="range" min="0.1" max="1.5" step="0.01" v-model.number="logoScale" />
                        <span>{{ logoScale.toFixed(2) }}</span>
                    </div>
                    <div class="row">
                        <label>로고 회전</label>
                        <input type="range" min="-180" max="180" step="1" v-model.number="logoRotation" />
                        <span>{{ logoRotation.toFixed(0) }}°</span>
                    </div>
                    <div class="row">
                        <label>로고 불투명도</label>
                        <input type="range" min="0" max="1" step="0.01" v-model.number="logoOpacity" />
                        <span>{{ (logoOpacity * 100).toFixed(0) }}%</span>
                    </div>
                </div>
            </div>
            <div class="actions">
                <div class="row">
                    <label>출력 크기</label>
                    <select v-model.number="selectedSizeOption">
                        <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }} x {{ opt }}</option>
                        <option :value="-1">기타...</option>
                    </select>
                    <input v-if="selectedSizeOption === -1" type="number" min="240" max="4096" step="1"
                        v-model.number="customSize" placeholder="정사각 해상도 (240~4096)" />
                </div>
                <button :disabled="!equiImage" @click="download">다운로드 ({{ resolvedSize }}x{{ resolvedSize }})</button>
                <button :disabled="!equiImage" @click="resetView">초기화</button>
            </div>
        </section>

        <section class="stage">
            <LittlePlanetCanvas :equirect="equiImage" :logo="logoImage" :zoom="zoom" :yaw="yaw" :pitch="pitch"
                :roll="roll" :logo-x="logoX" :logo-y="logoY" :logo-scale="logoScale" :logo-rotation="logoRotation"
                :logo-opacity="logoOpacity" ref="planetRef" />
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import LittlePlanetCanvas from './components/LittlePlanetCanvas.vue'

const equiImage = ref<HTMLImageElement | null>(null)
const logoImage = ref<HTMLImageElement | null>(null)

const showAdvanced = ref(false)

const zoom = ref(0.6)
const yaw = ref(0)
const pitch = ref(-90)
const roll = ref(0)

const logoX = ref(0)
const logoY = ref(0)
const logoScale = ref(0.15)
const logoRotation = ref(180)
const logoOpacity = ref(1)

const planetRef = ref<InstanceType<typeof LittlePlanetCanvas> | null>(null)

// 다운로드 해상도 옵션
const sizeOptions = [240, 480, 960, 1024, 1536]
const selectedSizeOption = ref<number>(1024)
const customSize = ref<number>(1024)
const resolvedSize = computed(() => {
    const s = selectedSizeOption.value === -1 ? customSize.value : selectedSizeOption.value
    // 유효성: 최소 240, 최대 4096으로 가드
    const clamped = Math.max(240, Math.min(4096, Math.floor(s || 0)))
    return clamped
})

function onLoadEqui(ev: Event) {
    const input = ev.target as HTMLInputElement
    if (!input.files || !input.files[0]) return
    const file = input.files[0]
    const img = new Image()
    img.onload = () => {
        // 기본 초기화
        zoom.value = 0.6
        yaw.value = 0
        pitch.value = -90
        roll.value = 0
        equiImage.value = img
    }
    img.src = URL.createObjectURL(file)
}

function onLoadLogo(ev: Event) {
    const input = ev.target as HTMLInputElement
    if (!input.files || !input.files[0]) return
    const file = input.files[0]
    const img = new Image()
    img.onload = () => {
        logoImage.value = img
    }
    img.src = URL.createObjectURL(file)
}

function resetView() {
    zoom.value = 0.6
    yaw.value = 0
    pitch.value = -90
    roll.value = 0
    logoX.value = 0
    logoY.value = 0
    logoScale.value = 0.15
    logoRotation.value = 180
    logoOpacity.value = 1
}

async function download() {
    if (!planetRef.value) return
    const size = resolvedSize.value
    const blob = await planetRef.value.exportPNG(size)
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `little-planet-${size}x${size}.png`
    a.click()
    URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.app {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
}

.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.uploader {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.file {
    border: 1px solid #ddd;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
}

.file input {
    display: none;
}

.sliders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 8px;
}

.group {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 8px;
}

.row {
    display: grid;
    grid-template-columns: 120px 1fr 60px;
    gap: 8px;
    align-items: center;
}

.actions {
    display: flex;
    gap: 8px;
}

.stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #eee;
    border-radius: 10px;
    overflow: hidden;
}
</style>
