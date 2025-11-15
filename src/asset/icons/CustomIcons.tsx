import mountainIcon from '../mountainicon.png';

export function MountainIcon() {
    return (
        <img
            src={mountainIcon.src}
            alt="Mountain Icon"
            style={{
                width: 40,
                height: 40,
                objectFit: 'contain'
            }}
        />
    );
}