<template>
  <div class="rich-editor" :class="{ 'is-disabled': disabled }">
    <Toolbar
      v-if="!disabled"
      class="rich-editor__toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      class="rich-editor__body"
      :style="{ height }"
      v-model="valueHtml"
      :default-config="editorConfig"
      mode="default"
      @on-created="handleCreated"
    />
  </div>
</template>

<script>
import { computed, shallowRef } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const toolbarConfig = {
  excludeKeys: ['uploadVideo', 'insertVideo', 'group-video'],
}

export default {
  name: 'XnRichEditor',
  components: { Editor, Toolbar },
  props: {
    modelValue: { type: String, required: false, default: '' },
    disabled: { type: Boolean, required: false, default: false },
    height: { type: String, required: false, default: '320px' },
    placeholder: { type: String, required: false, default: '请输入公告内容' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editorRef = shallowRef()
    const valueHtml = computed({
      get: () => props.modelValue || '',
      set: (val) => emit('update:modelValue', val),
    })
    const editorConfig = computed(() => ({
      placeholder: props.placeholder,
      readOnly: props.disabled,
    }))
    return { editorRef, valueHtml, toolbarConfig, editorConfig }
  },
  methods: {
    handleCreated(editor) {
      this.editorRef = editor
    },
  },
  beforeUnmount() {
    const editor = this.editorRef
    if (editor == null) return
    editor.destroy()
  },
}
</script>

<style scoped>
.rich-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: var(--app-card-bg, #fff);
}

.rich-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color);
}

.rich-editor__body {
  overflow-y: auto;
}

.rich-editor.is-disabled {
  background: var(--el-fill-color-light);
}
</style>
