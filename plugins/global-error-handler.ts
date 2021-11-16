import Vue from 'vue'

// Vue内エラー
Vue.config.errorHandler = (error, vm, info) => {
    console.error('global-error-handler vue errorHandler:', error)
    vm.$toast.error(error.message)
    return true
}

// Vue外エラー
window.addEventListener('error', (event) => {
    console.error('global-error-handler event error:', event)

})

// Promise.rejected エラー
window.addEventListener('unhandledrejection', (event) => {
    console.error('global-error-handler unhandledrejection:', event)

})
