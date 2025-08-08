// Full-batch gradient descent for y ≈ w*x + b
// Dataset: 5 entries, 1 feature

import * as fs from "fs";
import * as path from "path";

//hardcoded dataset
const xs: number[] = [1, 2, 3, 4, 5];
const ys: number[] = [3, 5, 7, 9, 11]; // roughly y = 2x + 1

// Initial weights and biases
const w0 = 0;
const b0 = 0;

function predict(x: number, w: number, b: number): number {
  return w * x + b;
}

function train(
  w0: number = 0,
  b0: number = 0,
  learningRate: number = 0.01,
  epochs: number = 10
): {
  w: number;
  b: number;
  epochs: number;
  learningRate: number;
  xs: number[];
  ys: number[];
} {
  let w = w0;
  let b = b0;

  const n = xs.length;
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Accumulate gradients over the whole batch
    let gradW = 0;
    let gradB = 0;
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const x = xs[i];
      const y = ys[i];
      const yHat = predict(x, w, b);
      const err = yHat - y;

      // MSE components
      loss += err * err;

      // Gradients for MSE: dL/dw = (2/n) * Σ(err * x), dL/db = (2/n) * Σ(err)
      gradW += err * x;
      gradB += err;
    }

    // Average gradients (include factor 2/n explicitly; could also fold 2 into lr)
    gradW = (2 / n) * gradW;
    gradB = (2 / n) * gradB;

    // Parameter update (single step per full batch)
    w = w - learningRate * gradW;
    b = b - learningRate * gradB;
  }

  return { w, b, epochs, learningRate, xs, ys };
}

export async function trainOutput() {
  const { w: w1, b: b1, epochs: epochs, learningRate: learningRate } = train();

  // Generate JSON output of the trained weights and biases
  const modelParams = {
    weight: w1,
    bias: b1,
    metadata: {
      epochs: epochs,
      learningRate: learningRate,
      trainingData: {
        features: xs,
        labels: ys,
      },
    },
  };

  return modelParams;
}
