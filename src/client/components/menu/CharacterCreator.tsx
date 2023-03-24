import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';
import axios from 'axios';

import names from '../../utility/names';
import images from '../../utility/images';

import {
  IconImg, NameBox, SStatName, SaveBox, CharacterContainer, StatButton, HStatName, StatPoolBox,
  CCContainer, LeftSpacer, RightSpacer, StatIconContainer, NameInput, EStatName,
  StatsContainer, HairSlot, FaceSlot, BodySlot, StyledCarouselItem, MStatName,
  HairCarousel, FaceCarousel, BodyCarousel, AvatarContainer, CCStartButton
} from './Styled';

import { UserContext } from '../../App';
import { MenuContext } from './Menu';
import { Character } from '../../utility/interface';

const CharacterCreator: React.FC = () => {

  const { userChars, setUserChars, currentChar, setCurrentChar, activeUser } = useContext(UserContext);
  const { hideStartButton, setHideStartButton, startFail, setStartFail } = useContext(MenuContext);

  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [inputName, setInputName] = useState('');
  const [hairImageUrls, setHairImageUrls] = useState([]);
  const [faceImageUrls, setFaceImageUrls] = useState([]);
  const [bodyImageUrls, setBodyImageUrls] = useState([]);
  const [cloudFolders, setCloudFolders] = useState(['hair', 'face', 'body']);
  const [loadedImage, setLoadedImage] = useState('');
  const [chosenHair, setChosenHair] = useState<string>('');
  const [chosenFace, setChosenFace] = useState<string>('');
  const [chosenBody, setChosenBody] = useState<string>('');
  const [newChar, setNewChar] = useState<Character>({} as Character);
  const [health, setHealth] = useState<number>(1);
  const [strength, setStrength] = useState<number>(1);
  const [endurance, setEndurance] = useState<number>(1);
  const [mood, setMood] = useState<number>(1);
  const [statPool, setStatPool] = useState<number>(18);

  const handleSelect = (i: number, images: string[], fn: any) => {
    fn(images[i]);
  };

  const handleInputValueChange = (e) => {
    setInputName(e.target.value);
    console.log('INPUT NAME', inputName, 'NEW CHAR', newChar);
  };

  const genRandomName = () => {
    setInputName(names[Math.floor(Math.random() * names.length)]);
  };

  // *************
  // <-- axios -->
  // *************

  const fetchImages = (folderName, i) => {
    const fetchFuncs = [setHairImageUrls, setFaceImageUrls, setBodyImageUrls];
    axios.get('/cloudinary/get', { params: { folder: folderName } })
      .then(response => {
        // <-- response.data[0].url
        // console.log('TEST', response.data.map(el => el.url));
        fetchFuncs[i](response.data.map(el => el.url));
      })
      .catch(err => {
        console.error('ERROR CLOUD FROM SERVER', err);
      });
  };

  const handleSaveChar = () => {
    if (!inputName.length) {
      genRandomName();
      return;
    }
    console.log('INSIDE SAVE', newChar);
    axios.post('/cloudinary/post', {
      topImageUrl: chosenHair,
      middleImageUrl: chosenFace,
      bottomImageUrl: chosenBody,
      characterObj: newChar
      // handle_id: activeUser.google_id
    })
      .then(response => {
        console.log('Success Posting from Client', response);
        userChars.push(response.data);
        setCurrentChar(response.data);
        axios.post(`/story/begin/${response.data._id}`)
          .catch(err => console.error('beginning story failed to fetch', err));
      })
      .catch(err => console.error('Fail Posting from Client', err));
  };

  // **********************
  // <-- event handling -->
  // **********************

  const loadCharDefaults = () => {
    setNewChar(prevChar => ({
      ...prevChar,
      handle_id: activeUser.google_id, // <-- activeUser.user_id
      image_url: '',
      inventory: [1, 1, 1, 1, 1, 1, 1, 1],
      health: 1,
      strength: 1,
      endurance: 1,
      mood: 1,
      location: Math.floor(Math.random() * 3 + 1),
      ally_count: 0,
      score: 0
    }));
  };

  const handleStatChange = (fn: any, modifier: string, statName: string, stat: number) => {
    if (modifier === '+' && statPool !== 0) {
      setNewChar(prevCharStats => ({
        ...prevCharStats,
        [statName]: ++stat
      }));
      fn(prevStat => ++prevStat);
      if (stat >= 0) { // <-- not needed?
        setStatPool(prevPool => --prevPool);
      }
    } else if (modifier === '-' && stat > 0) {
      setNewChar(prevCharStats => ({
        ...prevCharStats,
        [statName]: --stat
      }));
      fn(prevStat => --prevStat);
      if (stat > 0) {
        setStatPool(prevPool => ++prevPool);
      }
    }
  };

  const handleClickStart = () => {
    navigate('/game-view');
  };

  // *****************
  // <-- useEffect -->
  // *****************

  useEffect(() => {
    for (let i = 0; i < 3; i++) {
      fetchImages(cloudFolders[i], i);
    }
    genRandomName();
  }, []);

  useEffect(() => {
    if (hairImageUrls.length) { setChosenHair(hairImageUrls[0]); }
  }, [hairImageUrls]);

  useEffect(() => {
    if (faceImageUrls.length) { setChosenFace(faceImageUrls[0]); }
  }, [faceImageUrls]);

  useEffect(() => {
    if (bodyImageUrls.length) { setChosenBody(bodyImageUrls[0]); }
  }, [bodyImageUrls]);

  useEffect(() => {
    if (activeUser.handle_id === undefined) { loadCharDefaults(); }
  }, [activeUser]);

  useEffect(() => {
    if (inputName.length || inputName === '') {
      setNewChar(prevChar => (
        { ...prevChar, name: inputName }
      ));
    }
  }, [inputName]);

  // console.log('NEW CHAR from CHAR CREATOR', newChar);

  return (
    <>
      <CCContainer id='CCContainer'>
        <LeftSpacer id='LSpacer'></LeftSpacer>
        <CharacterContainer id='CharContainer'>

          <AvatarContainer id='Avatar Container'>
            <BodyCarousel
              id='Body Carousel'
              slide={false}
              indicators={false}
              onSelect={(i) => {
                handleSelect(i, bodyImageUrls, setChosenBody);
              }}
              interval={null}>
              {
                bodyImageUrls.map((body: string, i: number) => {
                  return <StyledCarouselItem id='Body Item' key={i}>
                    <BodySlot src={body} />
                  </StyledCarouselItem>;
                })
              }
            </BodyCarousel>
            <FaceCarousel
              id='Face Carousel'
              slide={false}
              indicators={false}
              onSelect={(i) => {
                handleSelect(i, faceImageUrls, setChosenFace);
              }}
              interval={null}>
              {
                faceImageUrls.map((face: string, i: number) => {
                  return <StyledCarouselItem id='Face Item' key={i}>
                    <FaceSlot id='FaceSlot' src={face} />
                  </StyledCarouselItem>;
                })
              }
            </FaceCarousel>
            <HairCarousel
              id='Hair Carousel'
              slide={false}
              indicators={false}
              onSelect={(i) => {
                handleSelect(i, hairImageUrls, setChosenHair);
              }}
              interval={null}>
              {
                hairImageUrls.map((hair: string, i: number) => {
                  return <StyledCarouselItem id='Hair Item' key={i}>
                    <HairSlot id='HairSlot' src={hair} />
                  </StyledCarouselItem>;
                })
              }
            </HairCarousel>
          </AvatarContainer>
          <NameBox>{newChar.name
            ? <p style={{ color: 'white' }}>Name: {newChar.name}</p>
            : <motion.p
              animate={{ x: [0, 10, -10, 6, -6, 3, -3, 0] }}
              style={{ color: 'white' }}
              transition={{ duration: 0.3 }}
            >Name: enter your name</motion.p>}<NameInput ref={nameInputRef} type="text" value={inputName} onChange={handleInputValueChange} /><StatButton onClick={genRandomName} style={{ marginTop: '1.35rem', marginLeft: '2.4rem', width: '11rem', height: '2.3rem' }}>Randomize</StatButton>
          </NameBox>
        </CharacterContainer>
        <StatsContainer id='Stats'>
          <StatIconContainer style={{ position: 'relative', right: '1.8rem' }}>
            <IconImg
              src={images.healthIcon} />
            <HStatName id='statName'>
              <span>Health: </span><span> {newChar.health}</span>
              <StatButton
                onClick={() => handleStatChange(setHealth, '-', 'health', health)}
                style={{ width: '2.5rem' }}>-</StatButton>
              <StatButton
                onClick={() => handleStatChange(setHealth, '+', 'health', health)}
                style={{ width: '2.5rem' }}>+</StatButton>
            </HStatName>
          </StatIconContainer>
          <StatIconContainer style={{ position: 'relative', right: '1.8rem' }}>
            <IconImg
              src={images.strengthIcon} />
            <SStatName id='statName'>
              <span>Strength: </span><span> {newChar.strength}</span>
              <StatButton
                onClick={() => handleStatChange(setStrength, '-', 'strength', strength)}
                style={{ width: '2.5rem' }}>-</StatButton>
              <StatButton
                onClick={() => handleStatChange(setStrength, '+', 'strength', strength)}
                style={{ width: '2.5rem' }}>+</StatButton>
            </SStatName>
          </StatIconContainer>
          <StatIconContainer style={{ position: 'relative', right: '1.8rem' }}>
            <IconImg
              src={images.enduranceIcon} />
            <EStatName id='statName'>
              <span>Endurance: </span><span> {newChar.endurance}</span>
              <StatButton
                onClick={() => handleStatChange(setEndurance, '-', 'endurance', endurance)}
                style={{ width: '2.5rem' }}>-</StatButton>
              <StatButton
                onClick={() => handleStatChange(setEndurance, '+', 'endurance', endurance)}
                style={{ width: '2.5rem' }}>+</StatButton>
            </EStatName>
          </StatIconContainer>
          <StatIconContainer style={{ position: 'relative', right: '1.8rem' }}>
            <IconImg
              src={images.moodIcon} />
            <MStatName id='statName'>
              <span>Mood: </span><span> {newChar.mood}</span>
              <StatButton
                onClick={() => handleStatChange(setMood, '-', 'mood', mood)}
                style={{ width: '2.5rem' }}>-</StatButton>
              <StatButton
                onClick={() => handleStatChange(setMood, '+', 'mood', mood)}
                style={{ width: '2.5rem' }}>+</StatButton>
            </MStatName>
          </StatIconContainer>
          <SaveBox>
            <StatPoolBox>
              <span>Stat Pool: </span><span> {statPool} </span>
            </StatPoolBox>
            <StatButton
              style={{ bottom: '0.6rem', position: 'relative', height: '2.3rem' }}
              onClick={() => {
                if (!inputName.length) {
                  nameInputRef.current?.focus();
                } else {
                  handleSaveChar();
                }
              }}>SAVE</StatButton>
          </SaveBox>
        </StatsContainer>
        <RightSpacer id='RSpacer'></RightSpacer>
      </CCContainer>
      <div style={{ bottom: '4.7rem', position: 'relative' }}>
        <div style={{ height: '0.5rem' }}>
          {startFail && <motion.h6
            animate={{ x: [0, 10, -10, 6, -6, 3, -3, 0] }}
            style={{
              color: 'red',
              maxWidth: '34.4rem',
              position: 'relative',
              left: '25rem',
              bottom: '1rem'
            }}
            transition={{ duration: .3 }}
          // exit={{ opacity: 0, scale: 0 }}
          >SAVE A CHARACTER TO PLAY</motion.h6>}
        </div>
        {hideStartButton &&
          <CCStartButton onClick={() => {
            if (currentChar.name === 'Someguy McPlaceholder') {
              setStartFail(true);
              return;
            } else {
              handleClickStart();
            }
          }}>Start Game</CCStartButton>
        }
      </div>
    </>
  );
};

export default CharacterCreator;
