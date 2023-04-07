import {expect, test} from '@jest/globals'
import { createSignal, createEffect } from "./signal";

test('check initial value and setter', () => {
    const [getValue, setValue] = createSignal(1)
    expect(getValue()).toBe(1)
    setValue(2)
    expect(getValue()).toBe(2)
})

test('derived or computed values', () => {
    const [getValue, setValue] = createSignal(1)
    const squared = () => Math.pow(getValue(), 2)
    expect(squared()).toBe(1)
    setValue(2)
    expect(squared()).toBe(4)
})


test('create effect', () => {
    const [getValue, setValue] = createSignal(1)
    let fromEffect = 0
    createEffect(() => {
        fromEffect = getValue()
    })
    expect(fromEffect).toBe(1)
    setValue(2)
    expect(fromEffect).toBe(2)
})

test('derived or computed values within effect', () => {
    const [getValue, setValue] = createSignal(1)
    const squared = () => Math.pow(getValue(), 2)
    let fromEffect = 0
    createEffect(() => {
        fromEffect = squared()
    })
    expect(fromEffect).toBe(1)
    setValue(2)
    expect(fromEffect).toBe(4)
})