import Button from '@/components/Button';
import { addImage } from '@/components/ProductListItem';
import Colors from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const CreateProductScreen = () => {
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const [locationOpen, setLocationOpen] = useState(false);
  const [locationValue, setLocationValue] = useState(null);

  const {id} = useLocalSearchParams();
  const isUpdating = !!id;

  const [locationItems, setLocationItems] = useState([
    { label: 'Prešov', value: 'presov' },
    { label: 'Sabinov', value: 'sabinov' },
    { label: 'Košice', value: 'kosice' },
  ]);

  const resetFields = () => {
    setName('');
    setLocationValue(null);
  }

  const [errors, setErrors] = useState('');

  const validateInput = () => {
    if (!name) {
      setErrors('Name is required');
      return false;
    }
    if (locationValue == null) {
      setErrors('You must set location');
      return false;
    }
    setErrors('');
    return true;
  }

  const onSubmit = () => {
    if (isUpdating) {
      //update
      onUpdateCreate();
    } else{
      onCreate();
    }
  }
 

  const onCreate = () => {
    if (!validateInput()) {
      return;
    }
    console.warn('Creating product', name, locationValue)

    //Save in the database

    resetFields();
  }

  const onUpdateCreate = () => {
    if (!validateInput()) {
      return;
    }
    console.warn('Updating Product: ');

    //Save in the database

    resetFields();
  }


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const onDelete = () => {
    console.warn('DELETE')
  }

  const confirmDelete = () => {
    Alert.alert('Confirm', 'Are you sure you want to delete this product?', [
      {
        text: 'Cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onDelete,
      },
    ])
  }
    
  return (
    <View style={styles.container}>
      <Stack.Screen options={{title: isUpdating ? 'Update Product' : 'Create Product'}} />
      <Image source={{uri: image || addImage}} style={styles.addImage} />
      <Text onPress={pickImage} style={styles.textButton}>Select Image</Text>

      
      <Text style={styles.label}>trash name</Text>
      <TextInput value={name} onChangeText={setName} placeholder='name' style={styles.input}></TextInput>

      
      <Text style={styles.label}>Select Location</Text>
      <DropDownPicker
        open={locationOpen}
        value={locationValue}
        items={locationItems}

        setOpen={setLocationOpen}
        setValue={setLocationValue}
        setItems={setLocationItems}
        placeholder="Choose location..."
        style={styles.dropdown}
      />

      <Text style={{color:'red'}} >{errors}</Text>
      <Button onPress={onSubmit} text={isUpdating ? 'Update' : 'Create'}/>
      {isUpdating && (
        <Text onPress={confirmDelete} style={styles.textButton} >
          Delete
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex : 1,
        justifyContent: 'center',
        padding: 10,
    },
    input: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 5,
        marginBottom: 16,
    },
    label: {
        color: 'gray',
        fontSize: 16,
    },
    dropdown: {
      backgroundColor: 'white',
      borderColor: 'none',
      marginBottom: 16,
    },
    addImage: {
      aspectRatio: 1,
      alignSelf: 'center',
      width:'50%',
    },
    textButton: {
      alignSelf: 'center',
      fontWeight: 'bold',
      color: Colors.light.tint,
    },
});

export default CreateProductScreen