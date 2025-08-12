<template>
  <canvas ref="canvasEl"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick, defineExpose } from 'vue'
import { createGL, createProgram, createTextureFromImage, createFramebuffer } from '../gl/shader'
import { quadVS, littlePlanetFS } from '../gl/littlePlanet.glsl'

const props = defineProps<{
  equirect: HTMLImageElement | null
  logo: HTMLImageElement | null
  zoom: number
  yaw: number
  pitch: number
  roll: number
  logoX: number
  logoY: number
  logoScale: number
  logoRotation: number
  logoOpacity: number
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let gl: WebGL2RenderingContext | null = null
let prog: WebGLProgram | null = null

let vao: WebGLVertexArrayObject | null = null
let vbo: WebGLBuffer | null = null

let equiTex: WebGLTexture | null = null
let logoTex: WebGLTexture | null = null

let uLocs: Record<string, WebGLUniformLocation | null> = {}

function initGL() {
  if (!canvasEl.value) return
  gl = createGL(canvasEl.value)

  // Program
  prog = createProgram(gl, quadVS, littlePlanetFS)
  gl.useProgram(prog)

  // Quad [-1,1]^2
  vao = gl.createVertexArray()
  vbo = gl.createBuffer()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  const quad = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ])
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  // Uniforms
  uLocs = {
    uEqui: gl.getUniformLocation(prog!, 'uEqui'),
    uEquiSize: gl.getUniformLocation(prog!, 'uEquiSize'),
    uLogo: gl.getUniformLocation(prog!, 'uLogo'),
    uLogoSize: gl.getUniformLocation(prog!, 'uLogoSize'),
    uHasLogo: gl.getUniformLocation(prog!, 'uHasLogo'),
    uZoom: gl.getUniformLocation(prog!, 'uZoom'),
    uYawPitchRoll: gl.getUniformLocation(prog!, 'uYawPitchRoll'),
    uLogoPos: gl.getUniformLocation(prog!, 'uLogoPos'),
    uLogoScale: gl.getUniformLocation(prog!, 'uLogoScale'),
    uLogoRotDeg: gl.getUniformLocation(prog!, 'uLogoRotDeg'),
    uLogoOpacity: gl.getUniformLocation(prog!, 'uLogoOpacity'),
  }

  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
}

function ensureTextures() {
  if (!gl) return
  gl.useProgram(prog)
  if (props.equirect) {
    if (equiTex) gl.deleteTexture(equiTex)
    equiTex = createTextureFromImage(gl, props.equirect)
  }
  if (props.logo) {
    if (logoTex) gl.deleteTexture(logoTex)
    logoTex = createTextureFromImage(gl, props.logo)
  }
}

function setCanvasSizeToCSSPixelSize() {
  if (!canvasEl.value) return
  const parent = canvasEl.value.parentElement
  const size = parent ? Math.min(parent.clientWidth, parent.clientHeight || parent.clientWidth) : 600
  canvasEl.value.width = size
  canvasEl.value.height = size
}

function renderToCurrentCanvas() {
  if (!gl || !prog || !canvasEl.value || !equiTex) return
  gl.viewport(0, 0, canvasEl.value.width, canvasEl.value.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(prog)

  // bind inputs
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, equiTex)
  gl.uniform1i(uLocs.uEqui, 0)
  gl.uniform2f(uLocs.uEquiSize, props.equirect!.width, props.equirect!.height)

  if (logoTex) {
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, logoTex)
    gl.uniform1i(uLocs.uLogo, 1)
    gl.uniform2f(uLocs.uLogoSize, props.logo!.width, props.logo!.height)
  }

  gl.uniform1f(uLocs.uZoom, props.zoom)
  gl.uniform3f(uLocs.uYawPitchRoll, props.yaw, props.pitch, props.roll)
  gl.uniform1f(uLocs.uLogoScale, props.logoScale)
  gl.uniform2f(uLocs.uLogoPos, props.logoX, props.logoY)
  gl.uniform1f(uLocs.uLogoRotDeg, props.logoRotation)
  gl.uniform1f(uLocs.uLogoOpacity, props.logoOpacity)
  gl.uniform1i(uLocs.uHasLogo, logoTex ? 1 : 0)

  gl.bindVertexArray(vao)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  gl.bindVertexArray(null)
}

// Export a PNG at given square size
async function exportPNG(size: number): Promise<Blob | null> {
  if (!gl || !prog || !equiTex) return null

  const { fb, tex } = createFramebuffer(gl, size)
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.viewport(0, 0, size, size)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(prog)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, equiTex)
  gl.uniform1i(uLocs.uEqui, 0)
  gl.uniform2f(uLocs.uEquiSize, props.equirect!.width, props.equirect!.height)

  if (logoTex) {
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, logoTex)
    gl.uniform1i(uLocs.uLogo, 1)
    gl.uniform2f(uLocs.uLogoSize, props.logo!.width, props.logo!.height)
  }

  gl.uniform1f(uLocs.uZoom, props.zoom)
  gl.uniform3f(uLocs.uYawPitchRoll, props.yaw, props.pitch, props.roll)
  gl.uniform1f(uLocs.uLogoScale, props.logoScale)
  gl.uniform2f(uLocs.uLogoPos, props.logoX, props.logoY)
  gl.uniform1f(uLocs.uLogoRotDeg, props.logoRotation)
  gl.uniform1f(uLocs.uLogoOpacity, props.logoOpacity)
  gl.uniform1i(uLocs.uHasLogo, logoTex ? 1 : 0)

  gl.bindVertexArray(vao)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  gl.bindVertexArray(null)

  // read back via an offscreen canvas by binding texture to framebuffer is already done; use a temp 2D canvas
  const tmp = document.createElement('canvas')
  tmp.width = size
  tmp.height = size
  const ctx2d = tmp.getContext('2d')!

  const pixels = new Uint8Array(size * size * 4)
  gl.readBuffer(gl.COLOR_ATTACHMENT0)
  gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // WebGL has origin bottom-left, 2D canvas expects top-left; flip rows
  const rowStride = size * 4
  const flipped = new Uint8ClampedArray(pixels.length)
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * rowStride
    const dst = y * rowStride
    flipped.set(pixels.subarray(src, src + rowStride), dst)
  }
  const imgData = new ImageData(flipped, size, size)
  ctx2d.putImageData(imgData, 0, 0)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.deleteFramebuffer(fb)
  gl.deleteTexture(tex)

  return await new Promise<Blob | null>((resolve) => tmp.toBlob(resolve, 'image/png'))
}

function renderLoop() {
  renderToCurrentCanvas()
  rafId = requestAnimationFrame(renderLoop)
}
let rafId = 0

onMounted(async () => {
  await nextTick()
  setCanvasSizeToCSSPixelSize()
  initGL()
  ensureTextures()
  renderLoop()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', onResize)
  if (gl) {
    if (equiTex) gl.deleteTexture(equiTex)
    if (logoTex) gl.deleteTexture(logoTex)
    if (vbo) gl.deleteBuffer(vbo)
    if (vao) gl.deleteVertexArray(vao)
    if (prog) gl.deleteProgram(prog)
  }
  gl = null
})

function onResize() {
  setCanvasSizeToCSSPixelSize()
}

watch(() => props.equirect, () => {
  ensureTextures()
})
watch(() => props.logo, () => {
  ensureTextures()
})

// Expose export method
defineExpose({ exportPNG })
</script>

<style scoped>
/* 캔버스는 스크립트에서 설정한 고유 width/height(정사각)를 사용하고,
   부모 크기를 넘지 않도록 최대값만 제한한다. */
canvas {
  display: block;
  /* 고정 스트레치 방지: 고유 픽셀 크기를 레이아웃 크기로 사용 */
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}
</style>
