// Full-batch gradient descent for y ≈ w*x + b
// Dataset: 5 entries, 1 feature

const xs: number[] = [1, 2, 3, 4, 5];
const ys: number[] = [3, 5, 7, 9, 11]; // roughly y = 2x + 1

// Model params
let w = 0; // weight
let b = 0; // bias

// Hyperparams
const learningRate = 0.01;
const epochs = 10;

function predict(x: number): number {
  return w * x + b;
}

function train(): void {
  const n = xs.length;
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Accumulate gradients over the whole batch
    let gradW = 0;
    let gradB = 0;
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const x = xs[i];
      const y = ys[i];
      const yHat = predict(x);
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

    // Optional: print a little progress
    if ((epoch + 1) % 1 === 0) {
      const mse = (1 / n) * loss;
      console.log(`epoch=${epoch + 1}  mse=${mse.toFixed(6)}  w=${w.toFixed(6)}  b=${b.toFixed(6)}`);
    }
  }
}

train();

// Test prediction
for (let i = 0; i < xs.length; i++) {
  console.log(`x=${xs[i]}  y=${ys[i]}  y_hat=${predict(xs[i]).toFixed(4)}`);
}

// Generate JSON output of the trained weights and biases
const modelParams = {
  weight: w,
  bias: b,
  metadata: {
    epochs: epochs,
    learningRate: learningRate,
    trainingData: {
      features: xs,
      labels: ys
    }
  }
};

console.log('\nTrained model parameters:');
console.log(JSON.stringify(modelParams, null, 2));
