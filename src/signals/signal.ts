export type valueGetterFunction<T> = () => T
export type valueSetterFunction<T> = (newValue: T) => void
export type subscriberFunction = () => void

const context: subscriberFunction[] = []
function getCurrentObserver() {
    return context[context.length - 1]
}




export function createSignal<T>(initialValue: T): [valueGetterFunction<T>, valueSetterFunction<T>] {
    let value = initialValue
    let subscribers = new Set<subscriberFunction>()
    function getter() {
        const currentCtx = getCurrentObserver()
        if(currentCtx) {
            subscribers.add(currentCtx)
        }
        return value
    }
    function setter(newValue: T) {
        value = newValue
        for(const subscriber of subscribers) {
            subscriber()
        }
    }
    return [getter, setter]
}

export function createEffect(fun: subscriberFunction) {
    function execute() {
        context.push(execute)
        try {
            fun()
        } finally {
            context.pop()
        }
    }
    execute()
}