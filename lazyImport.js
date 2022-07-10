import { hydrateWhenVisible } from 'vue-lazy-hydration'

const isDev = process.env.NODE_ENV === 'development'

let idleExecuteResolve = true
export const setIdleExecute = value => (idleExecuteResolve = value)

const execute = component => {
  return new Promise(resolve => {
    if ('requestIdleCallback' in global) {
      global.requestIdleCallback(
        deadline => {
          const time = deadline.timeRemaining()
          if (time > 10 || deadline.didTimeout) {
            resolve(component)
          } else {
            resolve(execute(component))
          }
        },
        { timeout: 2000 }
      )
    } else {
      resolve(component)
    }
  })
}

const wrap = (component, executeResolve) => {
  return hydrateWhenVisible(
    async () => {
      if (executeResolve) {
        return execute(await component())
      } else {
        return component()
      }
    },
    {
      observerOptions: { rootMargin: '0%' }
    }
  )
}

/**
 * @description 
 * - Ensures that components are initialized only when needed in the visible viewport.
 * - Optimizes initialization of critical components on initial page load (critical components are initially in the visible viewport).
 * @example
 * components: {
 *  Footer: lazyImport(() => import('@/components/Footer.vue'))
 * } 
 */
const lazyImport = component => {
  if (isDev) {
    // important for clean hot reload in dev
    return component
  }

  return {
    render(h) {
      return h(
        wrap(component, !process.server && idleExecuteResolve),
        {
          attrs: this.$attrs,
          on: this.$listeners,
          scopedSlots: this.$scopedSlots
        },
        this.$slots.default
      )
    }
  }
}

export default lazyImport