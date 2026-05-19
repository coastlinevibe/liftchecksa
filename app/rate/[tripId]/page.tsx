'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, Shield, Clock, MessageSquare, Car } from 'lucide-react';

export default function RateTripPage() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');

  const positiveTags = [
    'On time',
    'Friendly',
    'Clean car',
    'Safe driver',
    'Good conversation',
    'Comfortable ride',
  ];

  const negativeTags = [
    'Late',
    'Rude',
    'Dirty car',
    'Unsafe driving',
    'Wrong vehicle',
    'Overcharged',
  ];

  const tags = rating >= 4 ? positiveTags : negativeTags;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-md mx-auto">
          <Link href="/dashboard/member" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Rate Your Trip</h1>
          <p className="text-xs text-slate-600">Help others travel safely</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Trip Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base font-bold text-slate-900">Thabo M.</span>
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xs text-slate-600">Cape Town → Mthatha</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-600">Date:</span>
                <span className="font-semibold text-slate-900 ml-1">Fri, 16 May</span>
              </div>
              <div>
                <span className="text-slate-600">Vehicle:</span>
                <span className="font-semibold text-slate-900 ml-1">Toyota Corolla</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Stars */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3 text-center">How was your trip?</h2>
          
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-center">
            {rating === 0 && <p className="text-sm text-slate-600">Tap to rate</p>}
            {rating === 1 && <p className="text-sm font-semibold text-red-600">Terrible</p>}
            {rating === 2 && <p className="text-sm font-semibold text-orange-600">Poor</p>}
            {rating === 3 && <p className="text-sm font-semibold text-yellow-600">Okay</p>}
            {rating === 4 && <p className="text-sm font-semibold text-emerald-600">Good</p>}
            {rating === 5 && <p className="text-sm font-semibold text-emerald-600">Excellent!</p>}
          </div>
        </div>

        {rating > 0 && (
          <>
            {/* Quick Tags */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                {rating >= 4 ? 'What did you like?' : 'What went wrong?'}
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedTags.includes(tag)
                        ? rating >= 4
                          ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Written Feedback */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Additional Comments (Optional)</h2>
              
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share more details about your experience..."
                rows={4}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your feedback helps other passengers make informed decisions
              </p>
            </div>

            {/* Safety Questions */}
            {rating <= 2 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
                <h2 className="text-sm font-bold text-red-900 mb-2">Safety Concern?</h2>
                <p className="text-xs text-red-800 mb-3">
                  If you experienced unsafe driving, harassment, or fraud, please report this driver.
                </p>
                <Link
                  href="/report"
                  className="block w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold text-center"
                >
                  Report This Driver
                </Link>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold mb-3"
            >
              Submit Rating
            </button>

            <div className="bg-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-600 text-center">
                Your rating will be visible to other users and helps build trust in the community
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
