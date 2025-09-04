import * as React from "react";

const Loading = (props) => {
    return (
        <div className="loading-niso">
            <title>Loading...</title>
            <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <svg viewBox="0 0 73 85" role="img" id="skeleton-loadingCoffeeCup" style={{ width: '60px' }}>
                    <g>
                        <path stroke="#ae8f3d" strokeWidth="2.908" strokeLinecap="round" strokeLinejoin="round" fill="#8a6a16"
                            d="M53.8 38.6c-2-4-9.6-7.2-17.6-7.2-8 0-15.2 3.2-17.6 7.2 0 0 3.6 8 18.4 8 13.6-.4 16.8-8 16.8-8z" />
                        <path fill="#ae8f3d"
                            d="M55.254 40.5c2.528.356 4.692 2.723 4.692 5.3 0 2.728-2.11 5.03-4.726 5.357-.797.1-1.362.827-1.263 1.623.1.797.827 1.362 1.623 1.263 1.49-.186 2.866-.78 4.013-1.666 2.24 2.168 3.553 4.71 3.553 7.023 0 7.444-11.758 14.146-26.146 14.146-14.632 0-26.146-6.448-26.146-14.146 0-2.646 1.3-5.075 3.892-7.296.61-.523.68-1.44.158-2.05-.523-.61-1.44-.68-2.05-.158-3.194 2.738-4.908 5.937-4.908 9.504 0 9.758 13.03 17.054 29.054 17.054 15.78 0 29.054-7.566 29.054-17.054 0-3.213-1.7-6.485-4.498-9.17.82-1.285 1.298-2.806 1.298-4.43 0-4.403-3.85-8.254-8.254-8.254h-.4c-.504 0-.948.256-1.21.645-.388.262-.644.706-.644 1.21v4c0 9.054-7.204 16.146-16.146 16.146-8.797 0-16.146-7.35-16.146-16.146v-4.8c0-.803-.65-1.454-1.454-1.454-.803 0-1.454.65-1.454 1.454v4.8c0 5.496 2.415 10.503 6.227 14.004-.38.263-.627.7-.627 1.196 0 4.656 6.044 8.254 13.054 8.254 1.872 0 3.79-.303 5.953-.843.78-.194 1.252-.984 1.058-1.763-.194-.78-.984-1.252-1.763-1.058-1.95.487-3.653.756-5.247.756-5.14 0-9.375-2.263-10.052-4.678 3.015 2.01 6.614 3.186 10.452 3.186 10.538 0 19.054-8.383 19.054-19.054v-2.9z" />
                        <path fill="#ae8f3d"
                            d="M36.2 58.454c1.545 0 3.447-.317 5.553-.843.78-.194 1.252-.984 1.058-1.763-.194-.78-.984-1.252-1.763-1.058-1.894.473-3.592.756-4.847.756h-2.4c-.803 0-1.454.65-1.454 1.454 0 .803.65 1.454 1.454 1.454h2.4zM26.993 55.81c.67.445 1.57.265 2.017-.403.445-.67.265-1.57-.403-2.017-2.2-1.466-3.53-3.212-4.21-5.59-.22-.772-1.024-1.22-1.796-.998-.772.22-1.22 1.025-.998 1.797.875 3.062 2.635 5.372 5.39 7.21z" />
                        <path fill="#ffffff"
                            d="M35.8 32.355c-5.93 0-11.048 1.524-14.627 4.21-.462.345-.556 1-.21 1.462.347.462 1.002.556 1.464.21 3.197-2.398 7.874-3.792 13.373-3.792 2.316 0 3.323.063 4.546.37.56.14 1.128-.2 1.268-.76.14-.562-.2-1.13-.76-1.27-1.444-.36-2.57-.43-5.054-.43zM45.654 33.986c-.56-.14-1.128.2-1.268.76-.14.56.2 1.128.76 1.268 1.353.338 2.835 1.03 4.074 1.856.48.32 1.13.19 1.45-.29.32-.48.19-1.13-.29-1.45-1.428-.952-3.126-1.744-4.726-2.144z" />
                        <path id="skeleton-loadingCoffeeSteam" stroke="#8a6a16" fill="none" strokeWidth="3" strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M31 26.333c0-2.89 4.063-2.89 4.063-5.777 0-2.89-4.063-2.89-4.063-5.778 0-2.89 4.063-2.89 4.063-5.778M38 26.333c0-2.89 4.063-2.89 4.063-5.777 0-2.89-4.063-2.89-4.063-5.778 0-2.89 4.063-2.89 4.063-5.778" />
                    </g>
                </svg>
                <p style={{ color: '#ae8f3d' }}>Loading...</p>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid"
                    width={34}
                    height={34}
                    style={{
                        shapeRendering: "auto",
                        display: "block",
                        background: "transparent",
                    }}
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    {...props}
                >
                    <g>
                        <circle fill="#8f732b" r={10} cy={50} cx={84}>
                            <animate
                                begin="0s"
                                keySplines="0 0.5 0.5 1"
                                values="10;0"
                                keyTimes="0;1"
                                calcMode="spline"
                                dur="0.390625s"
                                repeatCount="indefinite"
                                attributeName="r"
                            />
                            <animate
                                begin="0s"
                                values="#8f732b;#8f732b;#ae8f3d;#ae8f3d;#8f732b"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="discrete"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="fill"
                            />
                        </circle>
                        <circle fill="#8f732b" r={10} cy={50} cx={16}>
                            <animate
                                begin="0s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="0;0;10;10;10"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="r"
                            />
                            <animate
                                begin="0s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="16;16;16;50;84"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="cx"
                            />
                        </circle>
                        <circle fill="#ae8f3d" r={10} cy={50} cx={50}>
                            <animate
                                begin="-0.390625s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="0;0;10;10;10"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="r"
                            />
                            <animate
                                begin="-0.390625s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="16;16;16;50;84"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="cx"
                            />
                        </circle>
                        <circle fill="#ae8f3d" r={10} cy={50} cx={84}>
                            <animate
                                begin="-0.78125s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="0;0;10;10;10"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="r"
                            />
                            <animate
                                begin="-0.78125s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="16;16;16;50;84"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="cx"
                            />
                        </circle>
                        <circle fill="#8f732b" r={10} cy={50} cx={16}>
                            <animate
                                begin="-1.171875s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="0;0;10;10;10"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="r"
                            />
                            <animate
                                begin="-1.171875s"
                                keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
                                values="16;16;16;50;84"
                                keyTimes="0;0.25;0.5;0.75;1"
                                calcMode="spline"
                                dur="1.5625s"
                                repeatCount="indefinite"
                                attributeName="cx"
                            />
                        </circle>
                        <g />
                    </g>
                </svg>
            </div>
        </div>
    );
};
export default Loading;
