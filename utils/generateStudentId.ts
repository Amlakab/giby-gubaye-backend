import Counter from '../models/Counter';

export const generateStudentId = async (batch: string) => {
  // Take last 2 digits of batch
  const batchSuffix = batch.slice(-2);

  const counter = await Counter.findOneAndUpdate(
    { name: 'student' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedNumber = counter.seq.toString().padStart(4, '0');

  return `TGG/${paddedNumber}/${batchSuffix}`;
};
