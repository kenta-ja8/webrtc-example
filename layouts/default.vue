<template>
    <div id="screen">
        <div id="menu-area" class="has-background-info-dark has-text-white">
            <div class="menu">
                <NuxtLink to="/web-meeting" class="menu-link">Web会議</NuxtLink>
            </div>
            <div class="menu">
                <NuxtLink to="/streaming" class="menu-link">配信</NuxtLink>
            </div>
        </div>
        <div id="content-area" class>
            <Nuxt />
        </div>
    </div>
</template>

<script>
import Vue from 'vue'
export default Vue.extend({
    middleware({ route, redirect }) {
        if (route.path == '/') {
            redirect('/web-meeting')
        }
    }
})
</script>

<style lang='scss'>
html,
body,
#__nuxt,
#__layout {
    width: 100%;
    height: 100%;
    scrollbar-width: none; // firefox
}
body::-webkit-scrollbar {
    display: none; // chrome, safari
}
#screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
}
#menu-area {
    width: 10rem;
    overflow-wrap: break-word;
    padding: 0.5rem;
    flex-shrink: 0;
}
#content-area {
    flex-grow: 1;
    padding: 0.5rem;
    overflow-y: scroll;
}
.menu-link {
    color: white;
    font-size: 1rem;
    font-weight: 400;
}
</style>