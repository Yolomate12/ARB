import { Dimensions, StyleSheet, Text, View } from "react-native"

export default function deviceCount() {

    return(
        <View style={styles.box}>
            <Text>ofjrijt</Text>
        </View>
    )
}


const { width, height } = Dimensions.get('window')
const scale = width / 375

const styles = StyleSheet.create({
    box: {
        width: width * 0.9,
        marginTop: height * 0.05,
        padding: 10,
        borderRadius: 5,
        margin: 'auto',
        height: height * 0.3,
        borderColor: '#C5C5C5;',
        borderWidth: 1,
    },
})