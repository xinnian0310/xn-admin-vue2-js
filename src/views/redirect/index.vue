<script>
export default {
  name: 'RedirectView',
  beforeMount() {
    const raw = this.$route.params.path
    const path = Array.isArray(raw) ? raw.join('/') : String(raw || '')
    this.$router.replace({ path: `/${path}`, query: this.$route.query })
  },
}
</script>

<template>
  <div />
</template>
