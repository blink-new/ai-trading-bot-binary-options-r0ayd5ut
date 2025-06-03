import AsyncStorage from '@react-native-async-storage/async-storage';
import { MarketData, TechnicalIndicators } from './TradingBotEngine';

export interface TrainingData {
  features: number[];
  label: number; // 0 for PUT, 1 for CALL
  timestamp: number;
  actualOutcome?: number;
}

export interface ModelArchitecture {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  activationFunction: 'relu' | 'sigmoid' | 'tanh';
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  learningRate: number;
}

export class MLModelTraining {
  private architecture: ModelArchitecture;
  private weights: number[][];
  private biases: number[][];
  private trainingHistory: TrainingMetrics[] = [];
  private symbol: string;

  constructor(symbol: string, architecture?: Partial<ModelArchitecture>) {
    this.symbol = symbol;
    this.architecture = {
      inputSize: 15,
      hiddenLayers: [32, 16],
      outputSize: 1,
      activationFunction: 'relu',
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      ...architecture
    };
    
    this.initializeWeights();
  }

  // Initialize neural network weights using Xavier initialization
  private initializeWeights(): void {
    this.weights = [];
    this.biases = [];
    
    const layers = [this.architecture.inputSize, ...this.architecture.hiddenLayers, this.architecture.outputSize];
    
    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayerSize = layers[i];
      const nextLayerSize = layers[i + 1];
      
      // Xavier initialization
      const limit = Math.sqrt(6 / (currentLayerSize + nextLayerSize));
      
      // Initialize weights
      const layerWeights: number[] = [];
      for (let j = 0; j < currentLayerSize * nextLayerSize; j++) {
        layerWeights.push((Math.random() * 2 - 1) * limit);
      }
      this.weights.push(layerWeights);
      
      // Initialize biases
      const layerBiases: number[] = [];
      for (let j = 0; j < nextLayerSize; j++) {
        layerBiases.push(0);
      }
      this.biases.push(layerBiases);
    }
  }

  // Activation functions
  private activate(x: number, function_name: string): number {
    switch (function_name) {
      case 'relu':
        return Math.max(0, x);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-x));
      case 'tanh':
        return Math.tanh(x);
      default:
        return x;
    }
  }

  private activateDerivative(x: number, function_name: string): number {
    switch (function_name) {
      case 'relu':
        return x > 0 ? 1 : 0;
      case 'sigmoid':
        const sigmoid = this.activate(x, 'sigmoid');
        return sigmoid * (1 - sigmoid);
      case 'tanh':
        const tanh = this.activate(x, 'tanh');
        return 1 - tanh * tanh;
      default:
        return 1;
    }
  }

  // Forward propagation
  private forwardPropagate(input: number[]): { outputs: number[][], activations: number[][] } {
    const outputs: number[][] = [input];
    const activations: number[][] = [input];
    
    for (let layer = 0; layer < this.weights.length; layer++) {
      const previousOutput = outputs[layer];
      const layerWeights = this.weights[layer];
      const layerBiases = this.biases[layer];
      
      const layerSize = layerBiases.length;
      const prevLayerSize = previousOutput.length;
      
      const layerOutput: number[] = [];
      const layerActivation: number[] = [];
      
      for (let neuron = 0; neuron < layerSize; neuron++) {
        let sum = layerBiases[neuron];
        
        for (let prevNeuron = 0; prevNeuron < prevLayerSize; prevNeuron++) {
          sum += previousOutput[prevNeuron] * layerWeights[neuron * prevLayerSize + prevNeuron];
        }
        
        layerOutput.push(sum);
        
        // Apply activation function (sigmoid for output layer, others for hidden)
        const activationFunc = layer === this.weights.length - 1 ? 'sigmoid' : this.architecture.activationFunction;
        layerActivation.push(this.activate(sum, activationFunc));
      }
      
      outputs.push(layerOutput);
      activations.push(layerActivation);
    }
    
    return { outputs, activations };
  }

  // Backward propagation
  private backPropagate(
    input: number[], 
    target: number, 
    outputs: number[][], 
    activations: number[][]
  ): { weightGradients: number[][], biasGradients: number[][] } {
    const weightGradients: number[][] = [];
    const biasGradients: number[][] = [];
    
    // Initialize gradients
    for (let layer = 0; layer < this.weights.length; layer++) {
      weightGradients.push(new Array(this.weights[layer].length).fill(0));
      biasGradients.push(new Array(this.biases[layer].length).fill(0));
    }
    
    // Calculate output layer error
    const outputLayer = this.weights.length - 1;
    const prediction = activations[activations.length - 1][0];
    const outputError = prediction - target;
    
    let layerErrors = [outputError];
    
    // Backward pass
    for (let layer = outputLayer; layer >= 0; layer--) {
      const currentErrors = layerErrors;
      const nextErrors: number[] = [];
      
      const prevLayerSize = activations[layer].length;
      const currentLayerSize = this.biases[layer].length;
      
      // Calculate gradients for this layer
      for (let neuron = 0; neuron < currentLayerSize; neuron++) {
        const error = currentErrors[neuron];
        
        // Bias gradient
        biasGradients[layer][neuron] = error;
        
        // Weight gradients and error propagation
        for (let prevNeuron = 0; prevNeuron < prevLayerSize; prevNeuron++) {
          const weightIndex = neuron * prevLayerSize + prevNeuron;
          weightGradients[layer][weightIndex] = error * activations[layer][prevNeuron];
          
          // Propagate error to previous layer
          if (layer > 0) {
            if (nextErrors.length <= prevNeuron) {
              nextErrors[prevNeuron] = 0;
            }
            nextErrors[prevNeuron] += error * this.weights[layer][weightIndex];
          }
        }
      }
      
      // Apply activation derivative for hidden layers
      if (layer > 0) {
        for (let i = 0; i < nextErrors.length; i++) {
          const activationFunc = layer === 1 ? this.architecture.activationFunction : this.architecture.activationFunction;
          nextErrors[i] *= this.activateDerivative(outputs[layer][i], activationFunc);
        }
        layerErrors = nextErrors;
      }
    }
    
    return { weightGradients, biasGradients };
  }

  // Update weights using gradients
  private updateWeights(weightGradients: number[][], biasGradients: number[][]): void {
    for (let layer = 0; layer < this.weights.length; layer++) {
      // Update weights
      for (let i = 0; i < this.weights[layer].length; i++) {
        this.weights[layer][i] -= this.architecture.learningRate * weightGradients[layer][i];
      }
      
      // Update biases
      for (let i = 0; i < this.biases[layer].length; i++) {
        this.biases[layer][i] -= this.architecture.learningRate * biasGradients[layer][i];
      }
    }
  }

  // Train the model with batch processing
  public async trainModel(trainingData: TrainingData[]): Promise<TrainingMetrics[]> {
    console.log(`Starting training for ${this.symbol} with ${trainingData.length} samples`);
    
    // Split data into training and validation
    const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * 0.8);
    const trainData = shuffled.slice(0, splitIndex);
    const validationData = shuffled.slice(splitIndex);
    
    this.trainingHistory = [];
    
    for (let epoch = 0; epoch < this.architecture.epochs; epoch++) {
      let totalLoss = 0;
      let correct = 0;
      
      // Shuffle training data for each epoch
      const epochData = [...trainData].sort(() => Math.random() - 0.5);
      
      // Process in batches
      for (let batchStart = 0; batchStart < epochData.length; batchStart += this.architecture.batchSize) {
        const batchEnd = Math.min(batchStart + this.architecture.batchSize, epochData.length);
        const batch = epochData.slice(batchStart, batchEnd);
        
        // Accumulate gradients for the batch
        const accumulatedWeightGradients: number[][] = [];
        const accumulatedBiasGradients: number[][] = [];
        
        // Initialize accumulated gradients
        for (let layer = 0; layer < this.weights.length; layer++) {
          accumulatedWeightGradients.push(new Array(this.weights[layer].length).fill(0));
          accumulatedBiasGradients.push(new Array(this.biases[layer].length).fill(0));
        }
        
        let batchLoss = 0;
        let batchCorrect = 0;
        
        // Process each sample in the batch
        for (const sample of batch) {
          const { outputs, activations } = this.forwardPropagate(sample.features);
          const prediction = activations[activations.length - 1][0];
          
          // Calculate loss (binary cross-entropy)
          const loss = -(sample.label * Math.log(Math.max(prediction, 1e-15)) + 
                          (1 - sample.label) * Math.log(Math.max(1 - prediction, 1e-15)));\n          batchLoss += loss;\n          \n          // Check accuracy\n          const predictedClass = prediction > 0.5 ? 1 : 0;\n          if (predictedClass === sample.label) {\n            batchCorrect++;\n          }\n          \n          // Calculate gradients\n          const { weightGradients, biasGradients } = this.backPropagate(\n            sample.features, sample.label, outputs, activations\n          );\n          \n          // Accumulate gradients\n          for (let layer = 0; layer < weightGradients.length; layer++) {\n            for (let i = 0; i < weightGradients[layer].length; i++) {\n              accumulatedWeightGradients[layer][i] += weightGradients[layer][i];\n            }\n            for (let i = 0; i < biasGradients[layer].length; i++) {\n              accumulatedBiasGradients[layer][i] += biasGradients[layer][i];\n            }\n          }\n        }\n        \n        // Average gradients and update weights\n        for (let layer = 0; layer < accumulatedWeightGradients.length; layer++) {\n          for (let i = 0; i < accumulatedWeightGradients[layer].length; i++) {\n            accumulatedWeightGradients[layer][i] /= batch.length;\n          }\n          for (let i = 0; i < accumulatedBiasGradients[layer].length; i++) {\n            accumulatedBiasGradients[layer][i] /= batch.length;\n          }\n        }\n        \n        this.updateWeights(accumulatedWeightGradients, accumulatedBiasGradients);\n        \n        totalLoss += batchLoss;\n        correct += batchCorrect;\n      }\n      \n      // Calculate epoch metrics\n      const avgLoss = totalLoss / trainData.length;\n      const accuracy = correct / trainData.length;\n      \n      // Validation\n      const { validationLoss, validationAccuracy } = this.validateModel(validationData);\n      \n      const metrics: TrainingMetrics = {\n        epoch: epoch + 1,\n        loss: avgLoss,\n        accuracy,\n        validationLoss,\n        validationAccuracy,\n        learningRate: this.architecture.learningRate\n      };\n      \n      this.trainingHistory.push(metrics);\n      \n      // Log progress every 10 epochs\n      if ((epoch + 1) % 10 === 0) {\n        console.log(`Epoch ${epoch + 1}/${this.architecture.epochs} - Loss: ${avgLoss.toFixed(4)}, Acc: ${(accuracy * 100).toFixed(1)}%, Val_Acc: ${(validationAccuracy * 100).toFixed(1)}%`);\n      }\n      \n      // Early stopping if validation loss increases for several epochs\n      if (epoch > 20 && this.shouldEarlyStop()) {\n        console.log(`Early stopping at epoch ${epoch + 1}`);\n        break;\n      }\n    }\n    \n    // Save trained model\n    await this.saveModel();\n    \n    return this.trainingHistory;\n  }\n  \n  // Validate model on validation set\n  private validateModel(validationData: TrainingData[]): { validationLoss: number; validationAccuracy: number } {\n    let totalLoss = 0;\n    let correct = 0;\n    \n    for (const sample of validationData) {\n      const { activations } = this.forwardPropagate(sample.features);\n      const prediction = activations[activations.length - 1][0];\n      \n      // Calculate loss\n      const loss = -(sample.label * Math.log(Math.max(prediction, 1e-15)) + \n                      (1 - sample.label) * Math.log(Math.max(1 - prediction, 1e-15)));\n      totalLoss += loss;\n      \n      // Check accuracy\n      const predictedClass = prediction > 0.5 ? 1 : 0;\n      if (predictedClass === sample.label) {\n        correct++;\n      }\n    }\n    \n    return {\n      validationLoss: totalLoss / validationData.length,\n      validationAccuracy: correct / validationData.length\n    };\n  }\n  \n  // Early stopping logic\n  private shouldEarlyStop(): boolean {\n    if (this.trainingHistory.length < 10) return false;\n    \n    const recent = this.trainingHistory.slice(-5);\n    const earlier = this.trainingHistory.slice(-10, -5);\n    \n    const recentAvgValLoss = recent.reduce((sum, m) => sum + m.validationLoss, 0) / recent.length;\n    const earlierAvgValLoss = earlier.reduce((sum, m) => sum + m.validationLoss, 0) / earlier.length;\n    \n    return recentAvgValLoss > earlierAvgValLoss;\n  }\n  \n  // Make prediction\n  public predict(features: number[]): number {\n    const { activations } = this.forwardPropagate(features);\n    return activations[activations.length - 1][0];\n  }\n  \n  // Save model to storage\n  public async saveModel(): Promise<void> {\n    try {\n      const modelData = {\n        architecture: this.architecture,\n        weights: this.weights,\n        biases: this.biases,\n        trainingHistory: this.trainingHistory,\n        timestamp: Date.now()\n      };\n      \n      await AsyncStorage.setItem(`ml_model_${this.symbol}`, JSON.stringify(modelData));\n    } catch (error) {\n      console.error('Error saving model:', error);\n    }\n  }\n  \n  // Load model from storage\n  public async loadModel(): Promise<boolean> {\n    try {\n      const stored = await AsyncStorage.getItem(`ml_model_${this.symbol}`);\n      if (!stored) return false;\n      \n      const modelData = JSON.parse(stored);\n      this.architecture = modelData.architecture;\n      this.weights = modelData.weights;\n      this.biases = modelData.biases;\n      this.trainingHistory = modelData.trainingHistory || [];\n      \n      return true;\n    } catch (error) {\n      console.error('Error loading model:', error);\n      return false;\n    }\n  }\n  \n  // Prepare training data from market data and indicators\n  public static prepareTrainingData(\n    marketDataHistory: MarketData[], \n    indicatorsHistory: TechnicalIndicators[]\n  ): TrainingData[] {\n    const trainingData: TrainingData[] = [];\n    \n    // We need at least 2 data points to determine the outcome\n    for (let i = 0; i < marketDataHistory.length - 1; i++) {\n      const currentData = marketDataHistory[i];\n      const nextData = marketDataHistory[i + 1];\n      const indicators = indicatorsHistory[i];\n      \n      if (!indicators) continue;\n      \n      // Extract features (same as in TradingBotEngine)\n      const features = [\n        indicators.rsi / 100, // Normalize RSI\n        Math.tanh(indicators.macd.macd * 1000), // Normalize MACD\n        (indicators.bollingerBands.upper - currentData.price) / currentData.price,\n        (indicators.bollingerBands.middle - currentData.price) / currentData.price,\n        (indicators.bollingerBands.lower - currentData.price) / currentData.price,\n        (indicators.sma20 - currentData.price) / currentData.price,\n        (indicators.sma50 - currentData.price) / currentData.price,\n        (indicators.ema12 - currentData.price) / currentData.price,\n        (indicators.ema26 - currentData.price) / currentData.price,\n        indicators.stochastic.k / 100,\n        indicators.stochastic.d / 100,\n        Math.tanh(indicators.volatility * 10), // Normalize volatility\n        Math.tanh(currentData.changePercent / 10), // Normalize change percentage\n        (currentData.price - indicators.support) / indicators.support,\n        (indicators.resistance - currentData.price) / currentData.price\n      ];\n      \n      // Determine label (1 for price increase, 0 for decrease)\n      const label = nextData.price > currentData.price ? 1 : 0;\n      \n      trainingData.push({\n        features,\n        label,\n        timestamp: currentData.timestamp\n      });\n    }\n    \n    return trainingData;\n  }\n  \n  // Get model performance metrics\n  public getPerformanceMetrics(): TrainingMetrics | null {\n    if (this.trainingHistory.length === 0) return null;\n    return this.trainingHistory[this.trainingHistory.length - 1];\n  }\n  \n  // Get training history\n  public getTrainingHistory(): TrainingMetrics[] {\n    return [...this.trainingHistory];\n  }\n}"
          ],
          "trainingData": trainingData,
          "symbol": this.symbol
        };
        
        await AsyncStorage.setItem(`training_data_${this.symbol}`, JSON.stringify(data));
      } catch (error) {
        console.error('Error storing training data:', error);
      }
    }
    
    // Load stored training data
    public async loadTrainingData(): Promise<TrainingData[]> {
      try {
        const stored = await AsyncStorage.getItem(`training_data_${this.symbol}`);
        if (!stored) return [];
        
        const data = JSON.parse(stored);
        return data.trainingData || [];
      } catch (error) {
        console.error('Error loading training data:', error);
        return [];
      }
    }
  }
}