import { Vector2 } from "three"

export const floatToVect2Array = (inputData: Float32Array) => {
    const outputData = []
    const inputCount = inputData.length / 2
    for (let i = 0; i < inputCount; i++) {
        outputData.push(new Vector2(inputData[2 * i + 0], inputData[2 * i + 1]))
    }
    return outputData
}